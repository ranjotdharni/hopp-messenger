const express = require('express');
const app = express();

const PORT = 8080;

app.get('', function(req, res)
{
    res.sendFile(__dirname + '/front/index.html')
});

app.listen(PORT, onLaunch());

function onLaunch(error)
{
    if (error)
    {
        console.log('Error: ', error)
    }
    else
    {
        console.log('Server live; port ' + PORT + '...')
    }
}