const express = require('express');
const path = require('path');
const router = require(__dirname + '/front/router/pages.js');
const app = express();

app.use(express.static(__dirname + '/front/public'));
app.use('/portal', router);

app.get('/test', function(req, res)
{
    console.log('GET req received');
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

app.listen(process.env.PORT || 8080, onLaunch());