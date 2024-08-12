var genesis;
var instance;

const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const mysql = require('mysql2');
const express = require('express');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const uuid = require('uuid');
const router = require(__dirname + '/front/router/pages.js');
const app = express();
require('dotenv').config();
const client_secret = process.env.client_secret;
const server = app.listen(process.env.PORT || 8080, onLaunch());
const io = require('socket.io')(server);

app.use(express.urlencoded({extended: true}));  //Place the attributes that interpret data first
app.use(express.json());
app.use(cookieParser());
app.use(favicon(__dirname + '/favicon.ico'));
app.use(express.static(__dirname + '/front/public'));
app.use('/home', guard); //Ex: must come after cookie-parser b/cause this method uses cookie-parser
app.use('/request', guard);
app.use('/user', guard);
app.use('/room', guard);
app.use('/', router);

const pool = mysql.createPool(
    {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        timezone: '-05:00'
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
    const auth = await getAuthInfo(req.body.username);
    
    if (!auth[0].length)
    {
        res.send(JSON.parse('{"status":401, "message":"User not found"}'));
        res.end();
    }
    else if (!(await bcrypt.compare(req.body.password, auth[0][0].password)))
    {
        res.send(JSON.parse('{"status":401, "message":"Username or Password incorrect"}'));
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
        res.send(JSON.parse('{"status":200, "message":"Session created"}'));
        res.end();
    }
});

app.post('/portal', async function(req, res)
{   
    const result = await registerUser(req.body.username, req.body.password);

    if (result instanceof Error)
    {
        console.log(result.message);
        res.send(JSON.parse('{"status":401, "message":"User already exists"}')).end();
    }
    else
    {
        res.send(JSON.parse('{"status":200, "message":"User created"}')).end();
    }
});

app.put('/guest', async function(req, res)
{
    const sessionToken = uuid.v4();
    const sessionUser = req.body.username;

    const current = new Date();
    current.setHours(current.getHours() + 2);
    const sessionExpiresAt = current;

    const final = await createSesh(sessionToken, sessionUser, sessionExpiresAt.getTime());
        
    res.cookie('session_token', sessionToken, {expires:sessionExpiresAt, httpOnly: true, secure: true});
    res.send(JSON.parse('{"status":200, "message":"(Session created)"}'));
    res.end();
});

app.post('/guest', async function(req, res)
{
    var result = await registerGuest();

    if (result instanceof Error)
    {
        console.log(result);
    }
    else
    {
        res.send(JSON.parse('{"status":200, "guest_user":"' + result + '"}')).end();
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

app.post('/request', async function(req, res)
{
    console.log('Refresh User Token fired...');
    var token = req.body.refresh;

    let buffer = await fetch('https://accounts.spotify.com/api/token?grant_type=refresh_token&refresh_token=' + token, 
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
        res.send(JSON.parse('{"token":"' + final.access_token + '"}')).end();
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
        console.log('Server live on PORT ' + (process.env.PORT || 8080) + ' =D');
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

    //!!GLOBAL!!
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
    const hash = await bcrypt.hash(p, 10);
    try{
    const result = await pool.query
    (
        'INSERT INTO user_info (username, password) VALUES (?, ?)',
        [u, hash]
    );

    return result;
    }
    catch(err)
    {
        return err;
    }
}

async function registerGuest()
{
    try {
        var seed = 'guest#' + uuid.v4().slice(24);
        var at = new Date();
        await pool.query
        (
            'INSERT INTO guest (username, created_at) VALUES (?, FROM_UNIXTIME(?))',
            [seed, (at.getTime())/1000]
        );
        return seed;
    } catch (error) {
        return error;
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

async function makeRoom(host, id, name, private)
{
    await pool.query
    (
        'INSERT INTO rooms (room_id, host1, name, private) VALUES (?, ?, ?, ?)',
        [id, host, name, private]
    );
}

async function removeRoom(room)
{
    await pool.query
    (
        'DELETE FROM rooms WHERE room_id = ?',
        [room]
    );
}

async function removeRooms(host)
{
    var buffer = await pool.query
    (
        'SELECT * FROM rooms WHERE host1 = ?',
        [host]
    );
    await pool.query
    (
        'DELETE FROM rooms WHERE host1 = ?',
        [host]
    );

    return buffer;
}

async function getRoom(id)
{
    return await pool.query
    (
        'SELECT * FROM rooms WHERE room_id = ?',
        [id]
    );
}

async function getLiveUser(s)
{
    return await pool.query
    (
        'SELECT username FROM live WHERE socket1 = ?',
        [s]
    );
}

async function getLiveId(u)
{
    return await pool.query
    (
        'SELECT socket1 AS socket FROM live WHERE username = ?',
        [u]
    );
}

async function goingLive(u, s)
{
    await pool.query
    (
        'DELETE FROM live WHERE (username = ? OR socket1 = ?)',
        [u, s]
    );

    await pool.query
    (
        'INSERT INTO live (username, socket1) VALUES (?, ?)',
        [u, s]
    );

    await pool.query
    (
        'SELECT socket1 AS socket from live WHERE EXISTS (SELECT CASE WHEN friend1 = ? THEN friend2 = username ELSE friend1 = username END FROM friends WHERE friend1 = ? OR friend2 = ?)',
        [u, u, u]
    ).then(raw => 
    {
        var result = raw[0];

        for (let i = 0; i < result.length; i++)
        {
            if (result[i].socket != s)
            {
                io.to(result[i].socket).emit('going-live', u);
            }
        }
    });
}

async function sleepUser(s)
{
    var user;

    await pool.query
    (
        'SELECT username FROM live WHERE socket1 = ?',
        [s]
    ).then(raw =>
    {
        user = raw[0][0].username;
    });

    await pool.query
    (
        'SELECT socket1 AS socket from live WHERE EXISTS (SELECT CASE WHEN friend1 = ? THEN friend2 = username ELSE friend1 = username END FROM friends WHERE friend1 = ? OR friend2 = ?)',
        [user, user, user]
    ).then(final => 
    {
        var result = final[0];

        for (let i = 0; i < result.length; i++)
        {
            if (result[i].socket != s)
            {
                io.to(result[i].socket).emit('going-sleep', user);
            }
        }
    });

    await pool.query
    (
        'DELETE FROM live WHERE socket1 = ?',
        [s]
    );
}

async function grabOnlineSockets(u)
{
    return await pool.query
    (
        'SELECT socket1 AS socket from live WHERE username IN (SELECT CASE WHEN friend1 = ? THEN friend2 ELSE friend1 END FROM friends WHERE friend1 = ? OR friend2 = ?)',
        [u, u, u]
    );
}

async function grabOnline(u)
{
    return await pool.query
    (
        'SELECT username, socket1 from live WHERE username IN (SELECT CASE WHEN friend1 = ? THEN friend2 ELSE friend1 END FROM friends WHERE friend1 = ? OR friend2 = ?)',
        [u, u, u]
    );
}

async function grabOffline(user)
{
    return await pool.query
    (
        `SELECT CASE WHEN friend1 = ? AND friend2 NOT IN (SELECT username FROM live WHERE username = friend2) THEN friend2 WHEN friend2 = ? AND friend1 NOT IN (SELECT username FROM live WHERE username = friend1) THEN friend1 END AS username FROM friends`,
        [user, user]
    );
}

async function grabPublicFriends(u)
{
    return await pool.query
    (
        `SELECT a.username AS username, b.room_id FROM live a, rooms b WHERE a.username IN (SELECT CASE WHEN friend1 = ? THEN friend2 WHEN friend2 = ? THEN friend1 END FROM friends) AND a.socket1 IN (SELECT host1 AS socket1 FROM rooms WHERE host1 = a.socket1 AND private = 0)`,
        [u, u]
    );
}

async function newUserIn(u, s)
{
    return await pool.query
    (
        'INSERT INTO user_in (username, socket1) VALUES (?, ?)',
        [u, s]
    );
}

async function dropSingleIn(u, s)
{
    return await pool.query
    (
        'DELETE FROM user_in WHERE (username = ? AND socket1 = ?)',
        [u, s]
    );
}

async function dropAllIn(s)
{
    return await pool.query
    (
        'DELETE FROM user_in WHERE socket1 = ?',
        [s]
    );
}

async function grabDropIn(u)
{
    var response;

    await pool.query
    (
        'SELECT socket1 AS socket FROM user_in WHERE username = ?',
        [u]
    ).then(raw => {
        response = raw[0];
    });

    await pool.query
    (
        'DELETE FROM user_in WHERE username = ?',
        [u]
    );

    return response;
}

async function checkFriendRequest(u, q)
{
    await pool.query
    (
        'SELECT * FROM user_info WHERE username = ?',
        [q]
    ).then(tree =>
    {
        if (tree[0].length == 0)
        {
            throw new Error('User not found'); //User not found
        }
    });

    await pool.query
    (
        'SELECT * FROM friends WHERE ((friend1 = ? AND friend2 = ?) OR (friend1 = ? AND friend2 = ?))',
        [u, q, q, u]
    ).then(raw => 
    {
        if (raw[0].length != 0)
        {
            throw new Error('Already friends');
        }
    });

    await pool.query
    (
        'SELECT * FROM friend_requests WHERE (sender = ? AND going_to = ?)',
        [u, q]
    ).then(final => 
    {
        if (final[0].length != 0)
        {
            throw new Error('Request already sent.');
        }
    });
}

async function newFriendRequest(u, f)
{
    var response;

    await pool.query
    (
        'INSERT INTO friend_requests (sender, going_to) VALUES (?, ?)',
        [u, f]
    );

    await pool.query
    (
        'SELECT socket1 AS socket FROM live WHERE username = ?',
        [f]
    ).then(tree =>
    {
        response = tree[0];
    });

    return response;
}

async function grabFriendRequests(to)
{
    var res;

    await pool.query
    (
        `SELECT sender AS username FROM friend_requests WHERE going_to = ?`,
        [to]
    ).then(raw =>
    {
        res = raw[0];
    });

    return res;
}

async function addFriend(f, t)
{
    var response;

    await pool.query
    (
        'DELETE FROM friend_requests WHERE (sender = ? AND going_to = ?)',
        [f, t]
    );

    await pool.query
    (
        'INSERT INTO friends (friend1, friend2) VALUES (?, ?)',
        [f, t]
    );

    await pool.query
    (
        'SELECT socket1 AS socket FROM live WHERE username = ?',
        [f]
    ).then(tree => 
    {
        response = tree[0];
    });

    return response;
}

async function dropRequest(f)
{
    await pool.query
    (
        'DELETE FROM friend_requests WHERE sender = ?',
        [f]
    );
}

async function dropFriend(u, d)
{
    await pool.query
    (
        'DELETE FROM friends WHERE (friend1 = ? AND friend2 = ?) OR (friend1 = ? AND friend2 = ?)',
        [u, d, d, u]
    );
}

async function grabLiveUser(d)
{
    return await pool.query
    (
        'SELECT socket1 AS socket FROM live WHERE username = ?',
        [d]
    );
}

async function loggingOut(u)
{
    await pool.query
    (
        'DELETE FROM sessions WHERE user = ?',
        [u]
    );
}

app.post('/room', async function(req, res)
{
    var id = req.body.socket;
    var room = await getRoom(id);

    if (room[0][0].private == 1)
    {
        res.send(JSON.parse('{"error":"This is a private room"}')).end();
    }
    else if (room[0].length != 0)
    {
        let result = room[0][0];
        res.send(JSON.parse('{"host":"' + result.host1 + '", "room_id":"' + result.room_id + '", "name":"' + result.name + '", "private":' + result.private + '}')).end();
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
    var live = req.body.live;
    var forOnline;

    if (!req.body.name)
    {
        roomName = req.body.user + uuid.v4().slice(28);
    }
    else
    {
        roomName = req.body.name;
    }

    if (live == 0)
    {
        forOnline = await grabOnlineSockets(req.body.user);

        for (let i = 0; i < forOnline[0].length; i++)
        {
            io.to(forOnline[0][i].socket).emit('public-room', req.body.user, newRoomID);
        }
    }

    await makeRoom(newHost, newRoomID, roomName, live);
    res.send(JSON.parse('{"room_id":"' + newRoomID + '", "host":"' + newHost + '", "room_name":"' + roomName + '", "private":' + live + '}')).end();
});

app.post('/live', async function(req, res)
{
    var u = req.body.user;
    var s = req.body.socket;

    await goingLive(u, s);
    let middle = await grabPublicFriends(u);
    var requests = await grabFriendRequests(u);
    var publics = middle[0];
    res.send({friends: requests, publics: publics}).end();
});

app.post('/friend', async function(req, res)
{
    var subject = req.body.user;
    var query = req.body.query;

    try
    {
        await checkFriendRequest(subject, query);
    }
    catch (e)
    {
        res.send(JSON.parse('{"error":"' + e.message + '"}')).end();
        return;
    }

    var live = await newFriendRequest(subject, query);

    if (live.length != 0)
    {
        io.to(live[0].socket).emit('request', subject, '0');
    }

    res.send(JSON.parse('{"message":"Request Sent"}')).end();
});

app.put('/friend', async function(req, res)
{
    var from = req.body.sender;
    var to = req.body.accept;

    var live = await addFriend(from, to);

    if (live.length != 0)
    {
        io.to(live[0].socket).emit('incoming-friend', to, 1);
        res.send(JSON.parse('{"friend":"' + from + '", "live":' + 1 +'}')).end();
    }
    else
    {
        res.send(JSON.parse('{"friend":"' + from + '", "live":' + 0 +'}')).end();
    }
});

app.delete('/friend', async function(req, res)
{
    var user = req.body.username;
    var dropping = req.body.drop;
    var notify;

    await dropFriend(user, dropping);
    notify = await grabLiveUser(dropping);

    if (notify[0].length != 0)
    {
        io.to(notify[0][0].socket).emit('friend-drop', user);
    }

    res.end();
});

app.delete('/deadrequest', async function(req, res)
{
    var from = req.body.from;
    await dropRequest(from);
    res.end();
});

app.post('/invite', async function(req, res)
{
    var from = req.body.from;
    var to = req.body.to;
    var type = req.body.type;

    let inter = await getLiveId(to);

    if (inter[0].length == 0)
    {
        res.send(JSON.parse('{"error":"User not live."}')).end();
    }
    else
    {
        io.to(inter[0][0].socket).emit('request', from, type);
        res.send(JSON.parse('{"message":"Invite Sent"}')).end();
    }
});

app.put('/invite', async function(req, res)
{
    var room = req.body.room;
    var branch = await getRoom(room);

    if (branch[0].length == 0)
    {
        res.send(JSON.parse('{"error":"Bad room session."}')).end();
    }
    else
    {
        let result = branch[0][0];
        res.send(JSON.parse('{"host":"' + result.host1 + '", "room_id":"' + result.room_id + '", "name":"' + result.name + '", "private":' + result.private + '}')).end();
    }
});

app.post('/friendlist', async function(req, res)
{
    var username = req.body.username;
    var sleptUsers = await grabOffline(username);
    var liveUsers = await grabOnline(username);

    res.send({live: liveUsers[0], sleep: sleptUsers[0]}).end();
});

app.put('/logout', async function(req, res)
{
    var u = req.body.user;
    await loggingOut(u);
    res.end();
});

io.on('connection', socket => {
    console.log(socket.id + ' has connected to server @ ' + (new Date()) + '...');

    socket.on('joining', async (room, user) => {
        socket.join(room);
        await newUserIn(user, room);
        socket.to(room).emit('new-user', user, room);
    });

    socket.on('new-message', (message, room, u) => {
        socket.broadcast.to(room).emit('receive-message', message, room, u);
    });

    socket.on('exit-room', async (room, u) => {
        socket.leave(room);
        await dropSingleIn(u, room);
        socket.to(room).emit('ex-user', u, room);
    });

    socket.on('drop-room', async (room) => {
        socket.broadcast.to(room).emit('leaving', room);
        socket.leave(room);
        await dropAllIn(room);
        await removeRoom(room);
    });

    socket.on('accept-invite', async (newUser, room) => {
        socket.join(room);
        await newUserIn(newUser, room);
        socket.to(room).emit('new-user', newUser, room);
    });

    socket.on('disconnect', async () => {
        let middle = await getLiveUser(socket.id);
        var user = middle[0][0].username;
        var notify = await grabDropIn(user);

        for (i = 0; i < notify.length; i++)
        {
            var client = notify[i].socket;
            io.to(client).emit('ex-user', user, client);
        }

        var response = await removeRooms(socket.id);
        var closed = response[0];
        for (var i = 0; i < closed.length; i++)
        {
            var ROOM = closed[i].room_id;
            socket.to(ROOM).emit('leaving', ROOM);
        }
        await sleepUser(socket.id);
        console.log(socket.id + ' has disconnected from server @ ' + (new Date()) + '...');
    });
});