const client_secret = process.env.client_secret || 'NjQ2ZjY4NjgzNmJjNDRlYzk4ZjU4MzQxNGQ4NGEyNjE6NjQ4MjU3MGNmZTViNDYxNTgzOWM4MzJlNTEwMDFlOTY=';
var genesis;
var instance;

const fetch = require('node-fetch');
const mysql = require('mysql2');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const uuid = require('uuid');
const router = require(__dirname + '/front/router/pages.js');
const app = express();
const server = app.listen(process.env.PORT || 8080, onLaunch());
const io = require('socket.io')(server);

app.use(express.urlencoded({extended: true}));  //Place the attributes that interpret data first
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname + '/front/public'));
app.use('/home', guard); //Ex: must come after cookie-parser b/cause this method uses cookie-parser
app.use('/request', guard);
app.use('/user', guard);
app.use('/room', guard);
app.use('/', router);

const pool = mysql.createPool(
    {
        host: process.env.DB_HOST || 'us-east.connect.psdb.cloud',
        user: process.env.DB_USER || 'y4roquoe2td3t11z1gl0',
        password: process.env.DB_PASS || 'pscale_pw_S5qPjECxwaAa18g5c2j0lRBZ1R5wU2Xp5BYQL8jReoM',
        database: process.env.DB_NAME || 'master',
        timezone: '-05:00',
        ssl: {
            rejectUnauthorized: true,
        }
    }
).promise();

async function guard(req, res, next)
{
    if (!req.cookies)
    {   
        console.log('1');
        res.sendFile(__dirname + '/front/index.html');
        return
    }
    const sessionToken = req.cookies['session_token'];
    if (!sessionToken)
    {
        console.log('2');
        res.sendFile(__dirname + '/front/index.html');
        return
    }

    const authResult = await authSession(sessionToken);

    if (authResult instanceof Error || !authResult[0].length)
    {
        console.log('3');
        res.sendFile(__dirname + '/front/index.html');
        return
    }

    const now = new Date();
    

    if (now > authResult[0][0].expires_at)
    {
        console.log('4');
        res.sendFile(__dirname + '/front/index.html');
        return
    }

    next();
}

app.get('/portal', function(req, res)
{
    var expCheck = new Date(instance);
    expCheck.setMinutes(expCheck.getMinutes() + 50);

    if (new Date() >= expCheck)
    {
        console.log('Token expired: grabbing fresh access token...');
        grabToken();
    }

    var buffer = '{"session_key":"' + genesis.access_token + '"}';
    res.send(JSON.parse(buffer));
    res.end();
});

app.put('/portal', async function(req, res)
{   
    const auth = await getAuthInfo(req.body.username)
    
    if (!auth[0].length)
    {
        res.send(JSON.parse('{"status":401, "message":"(User not found)"}'));
        res.end();
    }
    else if(req.body.password != auth[0][0].password)
    {
        res.send(JSON.parse('{"status":401, "message":"(Username or Password incorrect)"}'));
        res.end();
    }
    else
    {
        const sessionToken = uuid.v4();
        const sessionUser = auth[0][0].username;

        const current = new Date();
        current.setHours(current.getHours() + 2);
        const sessionExpiresAt = current;

        const final = await createSesh(sessionToken, sessionUser, sessionExpiresAt.getTime());
        
        res.cookie('session_token', sessionToken, {expires:sessionExpiresAt, httpOnly: true, secure: true});
        res.send(JSON.parse('{"status":200, "message":"(Session created)"}'))
        res.end();
    }
});

app.post('/portal', async function(req, res)
{   

    const result = await registerUser(req.body.username, req.body.password);

    if(result instanceof Error)
    {
        console.log("(duplicate entry; not injected)");
        res.send(JSON.parse('{"status":401, "message":"(User already exists)"}')).end();
    }
    else
    {
        res.send(JSON.parse('{"status":200, "message":"(User created)"}')).end();
    }
});

app.get('/user', async function(req, res)
{
    if (!req.cookies)
    {   
        res.send(JSON.parse('{"status":400, "error":"Bad Request"}')).end();
        return
    }

    const sessionToken = req.cookies['session_token'];
    if (!sessionToken)
    {
        res.send(JSON.parse('{"status":400, "error":"Bad Request"}')).end();
        return
    }

    const result = await pool.query
    (
        'SELECT user FROM sessions WHERE token = ?',
        [sessionToken]
    );

    if (result[0].length == 0)
    {
        res.send(JSON.parse('{"status":401, "error":"session not found"}')).end();
    }
    else
    {
        res.send(JSON.parse('{"status":200, "username":"' + result[0][0].user + '"}')).end();
    }
});

app.get('/request', async function(req, res)
{
    var code = req.query.code;
    var uri = req.query.uri;

    let buffer = await fetch('https://accounts.spotify.com/api/token?grant_type=authorization_code&code=' + code + '&redirect_uri=' + uri, 
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + client_secret,
        },
    });

    let final = await buffer.json();

    if (final.error)
    {
        console.log('Spotify Token Error: ' + final.error_description);
        res.send(JSON.parse('{"error":"' + final.error_description + '"}')).end();
    }
    else
    {
        res.send(JSON.parse('{"token":"' + final.access_token + '", "refresh":"' + final.refresh_token + '"}')).end();
    }
});

async function onLaunch(error)
{
    await grabToken();

    if (error)
    {
        console.log('Start-up Error: ', error);
    }
    else
    {
        console.log('Server live on {PORT: "' + (process.env.PORT || 8080) + '"}');
    }
}

async function grabToken()
{
    let buffer = await fetch('https://accounts.spotify.com/api/token?grant_type=client_credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + client_secret,
        },
    });

    genesis = await buffer.json();

    if (genesis.error)
    {
        console.log('Token acquirement error: ' + genesis.error);
    }
    else
    {
        instance = new Date();
        console.log('Fresh Token Assigned: ' + genesis.access_token);
    }
}

async function registerUser(u, p)
{   
    try{
    const result = await pool.query
    (
        'INSERT INTO user_info (username, password) VALUES (?, ?)',
        [u, p]
    );

    return result;
    }
    catch(err)
    {
        return err;
    }
}

async function getAuthInfo(u)
{
    const result = await pool.query
    (
        'SELECT * FROM user_info WHERE username = ?',
        [u]
    );

    return result;
}

async function createSesh(token, user, expiry)
{   
    const response = await pool.query
    (
        'INSERT INTO sessions (token, user, expires_at) VALUES (?, ?, FROM_UNIXTIME(?))',
        [token, user, expiry/1000]
    );

    return response;
}

async function authSession(token)
{
    var result = await pool.query
    (
        'SELECT expires_at FROM sessions WHERE token = ?',
        [token]
    );

    return result;
}

async function makeRoom(host, id, name)
{
    await pool.query
    (
        'INSERT INTO rooms (host, room_id, name) VALUES (?, ?, ?)',
        [host, id, name]
    );
}

async function removeRooms(host)
{
    await pool.query
    (
        'DELETE FROM rooms WHERE host = ?',
        [host]
    );
}

async function getRoom(id)
{
    return await pool.query
    (
        'SELECT * FROM rooms WHERE room_id = ?',
        [id]
    );
}

app.post('/room', async function(req, res)
{
    var id = req.body.socket;
    var room = await getRoom(id);

    if (room[0].length != 0)
    {
        let result = room[0][0];
        res.send(JSON.parse('{"host":"' + result.host + '", "room_id":"' + result.room_id + '", "name":"' + result.name + '"}')).end();
    }
    else
    {
        res.send(JSON.parse('{"error":"Room not found"}')).end();
    }
});

app.put('/room', async function(req, res)
{
    var newHost = req.body.socket;
    var roomName;
    var newRoomID = uuid.v4().slice(24);

    if (!req.body.name)
    {
        roomName = req.body.user + newRoomID;
    }
    else
    {
        roomName = req.body.name;
    }

    await makeRoom(newHost, newRoomID, roomName);
    console.log('Room created with ID ' + newRoomID);
    res.send(JSON.parse('{"message":"New Room -> Host: ' + newHost + ' Room ID: ' + newRoomID + '", "room_id":"' + newRoomID + '", "host":"' + newHost + '", "room_name":"' + roomName + '"}')).end();
});

io.on('connection', socket => {
    console.log(socket.id + ' has connected...');

    socket.on('join-room', room => {
        socket.join(room);
    });

    socket.on('new-message', (message, room) => {
        socket.broadcast.to(room).emit('receive-message', message, room);
    });

    socket.on('disconnect', async () => {
        await removeRooms(socket.id);
        console.log(socket.id + ' has disconnected from server...');
    });
});