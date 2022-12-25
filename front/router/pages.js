const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/', (req, res) =>
{
    res.redirect('/home');
});

router.get('/home', (req, res) =>
{
    res.sendFile(path.resolve(__dirname + '/../main.html'));
});

module.exports = router;