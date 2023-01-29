const socket = io();

document.getElementById('msg-send').onclick = () =>
{
    var msg = document.getElementById('msg-input').value.trim();

    if (msg.length != 0)
    {
        newMessage(msg, false);
    }

    newMessage('This is an automated reply; please do not respond.', true);
}

socket.on('connect', () => {
    console.log(socket.id + ' is live...');
});