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

router.get('/middle', (req, res) =>
{
    res.sendFile(path.resolve(__dirname + '/../middle.html'));
});

module.exports = router;