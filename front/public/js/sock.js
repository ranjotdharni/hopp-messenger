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

document.getElementById('user-add-button').onclick = () =>
{
    var entry = document.getElementById('user-search-input').value.trim();
    document.getElementById('user-search-input').value = '';
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

socket.on('leaving', room => {
    var index = Rooms.map(object => object.room).indexOf(room);
    dropRoom(document.getElementsByClassName('room-box')[index], Rooms[index].name);
});

socket.on('request', (from, type) => {
    newInboxRequest(from, type);
});

socket.on('incoming-friend', (friend, live) => {
    newFriend(friend, live);
});

socket.on('new-user', newUser => {
    if (newUser != user)
    {
        joinError(newUser + ' accepted your invite.');
    }
    else
    {
        joinError('Room Joined');
    }
});

socket.on('going-live', liveUser => {
    var index = Friends.map(object => object.friend).indexOf(liveUser);
    Friends[index].live = 1;
    document.getElementsByClassName('friends-box-status')[index].classList.remove('not-online');
});

socket.on('going-sleep', liveUser => {
    var index = Friends.map(object => object.friend).indexOf(liveUser);
    Friends[index].live = 0;
    document.getElementsByClassName('friends-box-status')[index].classList.add('not-online');
});

socket.on('public-room', (from, type) =>
{
    if (from != user)
    {
        publicRoom(from, type);
    }
});

socket.on('friend-drop', drop => 
{
    var x = Friends.map(object => object.friend).indexOf(drop);
    Friends[x].node.remove();
    Friends.splice(x, 1);
});