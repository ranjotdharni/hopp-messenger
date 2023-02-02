var socket = io();

document.getElementById('msg-send').onclick = () =>
{
    var msg = document.getElementById('msg-input').value.trim();
    document.getElementById('msg-input').value = '';

    if ((msg.length != 0) && (roomView > -1))
    {
        newMessage(msg, false, roomView);
        socket.emit('new-message', msg, Rooms[roomView].room);
    }
    else
    {
        joinError('No msg and/or room');
    }
}

socket.on('connect', () => {
    console.log(socket.id + ' is live...');
});

socket.on('receive-message', (message, room) => {
    var tar = Rooms.map(object => object.room).indexOf(room);
    newMessage(message, true, tar);

    if (tar != roomView)
    {
        newJoinNotif();
    }
});