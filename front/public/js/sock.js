var socket = io();

document.getElementById('msg-send').onclick = () =>
{
    var msg = document.getElementById('msg-input').value.trim();
    document.getElementById('msg-input').value = '';

    if ((msg.length != 0) && (roomView > -1))
    {
        newMessage(msg, false, roomView);
        newMessage('This is an automated reply; please do not respond.', true, roomView);
    }
    else
    {
        joinError('No msg and/or room');
    }
}

socket.on('connect', () => {
    console.log(socket.id + ' is live...');
});