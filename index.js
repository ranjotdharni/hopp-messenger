const mysql = require('mysql2');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const uuid = require('uuid');
const router = require(__dirname + '/front/router/pages.js');
const app = express();

app.use(express.urlencoded({extended: true}));  //Place the attributes that interpret data first
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname + '/front/public'));
app.use('/home', guard) //Ex: must come after cookie-parser b/cause this method uses cookie-parser
app.use('/', router);

const pool = mysql.createPool(
    {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        //timezone: '+00:00'
    }
).promise();

async function guard(req, res, next)
{
    if (!req.cookies)
    {   
        console.log('1');
        res.redirect('/');
        return
    }
    const sessionToken = req.cookies['session_token'];
    if (!sessionToken)
    {
        console.log('2');
        res.redirect('/');
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
        console.log(now);
        console.log(authResult[0][0].expires_at);
        console.log('4');
        res.sendFile(__dirname + '/front/index.html');
        return
    }

    next();
}

app.put('/portal', async function(req, res)
{   
    const auth = await getAuthInfo(req.body.username)
    
    if (!auth[0].length)
    {
        res.send(JSON.parse('{"status":400, "message":"(User not found)"}'));
        res.end();
    }
    else if(req.body.password != auth[0][0].password)
    {
        res.send(JSON.parse('{"status":400, "message":"(Username or Password incorrect)"}'));
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
        res.send(JSON.parse('{"status":400, "message":"(User already exists)"}')).end();
    }
    else
    {
        res.send(JSON.parse('{"status":200, "message":"(User created)"}')).end();
    }
});

function onLaunch(error)
{
    if (error)
    {
        console.log('Error: ', error);
    }
    else
    {
        console.log('Server live; port...');
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
    result = await pool.query
    (
        'SELECT expires_at FROM sessions WHERE token = ?',
        [token]
    );

    return result;
}


app.listen(process.env.PORT || 8080, onLaunch());   //Ensure listen call is at the end of server