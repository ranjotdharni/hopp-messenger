const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/', (req, res) =>
{
    res.sendFile(path.resolve(__dirname + '/../landing.html'));
});

router.get('/home', (req, res) =>
{
    res.sendFile(path.resolve(__dirname + '/../main.html'));
});

module.exports = router;