const express = require('express');
const path = require('path');
const router = require(__dirname + '/front/router/pages.js');
const app = express();

app.use(express.static(__dirname + '/front/public'));
app.use('', router);

const PORT = process.env.PORT || 8080;

app.get('/test', function(req, res)
{
    console.log('GET req received');
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