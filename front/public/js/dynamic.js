var session;
var started = false;
var resources = new Array(10);
var searchHash = new Array(10);
var Beacons = new Array(10);
var Genres = new Array();
var Rooms = new Array();
var nameTick;
var roomView = -1;
let user = null;

window.onload = async function()
{
    await newSesh();
};
document.getElementsByClassName('search-input')[0].onkeyup = searchArtists;
document.getElementsByClassName('search-input')[0].onclick = searchArtists;
document.getElementById('togglePlay').onclick = toggle;
document.getElementById('create-btn').onclick = newRoom;
document.getElementById('roomslabel').onclick = () =>
{
    if (document.getElementById('room-notif'))
    {
        document.getElementById('room-notif').remove();
    }
}
document.getElementById('prevTrack').onclick = async () =>
{
    await prev();
}
document.getElementById('nextTrack').onclick = async () =>
{
    await next();
}
document.getElementById('room-search-input').onkeyup = () => 
{
    if (document.getElementById('room-search-input').value.trim() != '')
    {
        document.getElementById('join-btn-label').classList.remove('dimmed');
        document.getElementById('join-btn-txt').classList.remove('dimmed');
    }
    else
    {
        document.getElementById('join-btn-label').classList.remove('dimmed');
        document.getElementById('join-btn-txt').classList.remove('dimmed');
        document.getElementById('join-btn-label').classList.add('dimmed');
        document.getElementById('join-btn-txt').classList.add('dimmed');
    }
}
document.getElementById('join-btn').onclick = async () =>
{
    var entry = document.getElementById('room-search-input').value.trim();
    document.getElementById('room-search-input').value = '';
    document.getElementById('join-btn-label').classList.remove('dimmed');
    document.getElementById('join-btn-txt').classList.remove('dimmed');
    document.getElementById('join-btn-label').classList.add('dimmed');
    document.getElementById('join-btn-txt').classList.add('dimmed');
    if (entry == '')
    {
        return;
    }

    joinError('ID not found');
}

async function getUser()
{
    var buffer = await fetch(window.location.origin + '/user');
    var final = await buffer.json();
    
    if (final.error)
    {
        console.log(final.error);
    }
    else
    {
        user = final.username;
    }
}

async function searchArtists()
{
    let searchTerm = 'https://api.spotify.com/v1/search?q=' 
            + document.getElementsByClassName('search-input')[0].value.replace(/ /g, "%20")
            + '&type=artist&market=US&limit=10&offset=0';

    let buffer = await fetch(searchTerm, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.session_key,
        },
    });

    var middle = await buffer.json();
    let result = middle.artists.items;
    let boxes = document.getElementsByClassName('artist-result');

    for (var i = 0; i < boxes.length; i++)
    {
        searchHash[i].Sid = (result[i].id);
        searchHash[i].Sname = (result[i].name);
        searchHash[i].Stype = (result[i].type);

        if(result[i].name.length > 26)
        {
            boxes[i].innerText = ((result[i].name.slice(0, 23) + '...') || '');
        }
        else
        {
            boxes[i].innerText = (result[i].name || '');
        }
    }
}

document.getElementsByClassName('search-input')[1].onkeyup = searchTracks;
document.getElementsByClassName('search-input')[1].onclick = searchTracks; 
async function searchTracks()
{
    let searchTerm = 'https://api.spotify.com/v1/search?q=' 
            + document.getElementsByClassName('search-input')[1].value.replace(/ /g, "%20")
            + '&type=track&market=US&limit=10&offset=0';

    let buffer = await fetch(searchTerm, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.session_key,
        },
    });

    var middle = await buffer.json();
    let result = middle.tracks.items;
    let boxes = document.getElementsByClassName('track-result');

    for (var i = 0; i < boxes.length; i++)
    {
        searchHash[i].Sid = (result[i].id);
        searchHash[i].Sname = (result[i].name);
        searchHash[i].Stype = (result[i].type);

        if(result[i].name.length > 26)
        {
            boxes[i].innerText = ((result[i].name.slice(0, 23) + '...') || '');
        }
        else
        {
            boxes[i].innerText = (result[i].name || '');
        }
    }
}

async function newSesh()
{
    await getUser();
    var middle = await fetch(window.location.origin + '/portal');
    session = await middle.json();

    if (sessionStorage.getItem('token'))
    {
        document.getElementById('spotify-tag').classList.add('connected');
    }
    else
    {
        document.getElementById('spotify-tag').classList.remove('connected');
    }

    setTimeout(async function()
    {
        await freshHarvest();
    }, 1000);
}

async function freshHarvest()
{
    for (var j = 0; j < 10; j++)
    {
        searchHash[j] = {Sname: '', Sid: '', Stype: ''};
        Beacons[j] = {name: '', id: '', type: ''};
    }

    for (var i = 0; i < resources.length; i++)
    {
        resources[i] = new Array(4);
    }

    let buffer = await fetch("https://api.spotify.com/v1/recommendations?limit=10&market=US&seed_artists=6icQOAFXDZKsumw3YXyusw"
            + "&seed_genres=hip-hop"
            + "&seed_tracks=2p8IUWQDrpjuFltbdgLOag", {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.session_key,
            },
    });

    var final = await buffer.json();
    hashResources(final.tracks);

    instateBeacons();
    instateResources(0);
    await instateMusic();
}

function addBeacon(arg)
{
    if (searchHash[arg].Sid == '')
    {
        console.log("No result; try searching again...");
    }
    else
    {
        for (var i = 0; i < Beacons.length; i++)
        {
            if (Beacons[i].id == '')
            {
                Beacons[i].id = searchHash[arg].Sid;
                Beacons[i].name = searchHash[arg].Sname;
                Beacons[i].type = searchHash[arg].Stype;
                break;
            }
        }

        instateBeacons();
    }
}

function dropBeacon(arg)
{
    if (Beacons[arg].id == '')
    {
        console.log("No result; try searching again...");
    }
    else
    {
        Beacons.splice(arg, 1);
        Beacons.push({name: '', id: '', type: ''});
    }

    instateBeacons();
}

function cycle(target, arg)
{
    if (!target.classList.contains('highlight'))
    {
        Genres.push(arg);
        target.classList.add('highlight');
    }
    else
    {
        Genres.splice(Genres.indexOf(arg), 1);
        target.classList.remove('highlight');
    }
}

function instateBeacons()
{
    var middle = document.getElementsByClassName('beacon-result');

    for (var i = 0; i < middle.length; i++)
    {
        middle[i].innerText = Beacons[i].name;
    }
}

function errBeacon(arg)
{
    document.getElementById('control-error').innerText = arg;
    document.getElementById('control-error').classList.remove('invisible');

    setTimeout(function ()
    {
        document.getElementById('control-error').classList.add('invisible');
    }, 7000);
}

async function fireBeacons()
{
    var artists = 0;
    var tracks = 0;

    if (Genres.length == 0)
    {
        errBeacon('Please select at least 1 genre.');
        return;
    }

    for (var i = 0; i < Beacons.length; i++)
    {
        if (Beacons[i].type == 'artist')
        {
            artists++;
        }
        else if (Beacons[i].type == 'track')
        {
            tracks++;
        }
    }

    if ((artists == 0) && (tracks == 0))
    {
        errBeacon('Must add beacon(s).');
    }
    else if (artists == 0)
    {
        errBeacon('Minimum 1 artist beacon required.');
    }
    else if (tracks == 0)
    {
        errBeacon('Minimum 1 track beacon required.');
    }
    else
    {
        player.pause();
        started = false;

        let Aid = '';
        let Tid = '';
        let Gid = '';

        for (var x = 0; x < Beacons.length; x++)
        {
            if (Beacons[x].type == 'artist')
            {
                if (Aid == '')
                {
                    Aid = Beacons[x].id;
                }
                else
                {
                    Aid = Aid + '%2C' + Beacons[x].id;
                }
            }
            else if (Beacons[x].type == 'track')
            {
                if (Tid == '')
                {
                    Tid = Beacons[x].id;
                }
                else
                {
                    Tid = Tid + '%2C' + Beacons[x].id;
                }
            }
        }

        for (var y = 0; y < Genres.length; y++)
        {
            if (Gid == '')
                {
                    Gid = Genres[y];
                }
                else
                {
                    Gid = Gid + '%20' + Genres[y];
                }
        }

        let buffer = await fetch("https://api.spotify.com/v1/recommendations?limit=10&market=US&seed_artists=" + Aid
            + "&seed_genres=" + Gid
            + "&seed_tracks=" + Tid, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.session_key,
            },
        });

        var final = await buffer.json();
        hashResources(final.tracks);
        await instateMusic();
        await player.togglePlay();
    }
}

function connect()
{
    location.href = 'https://accounts.spotify.com/authorize?response_type=code&client_id=646f686836bc44ec98f583414d84a261'
                    + '&scope=streaming%20user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20user-read-playback-position%20user-read-email%20user-read-private%20user-read-playback-position%20user-top-read%20user-read-recently-played%20app-remote-control' 
                    + '&redirect_uri=' + window.location.origin + '/middle&state=9564821374953801';
}

async function instateMusic()
{
    await fetch('https://api.spotify.com/v1/me/player/repeat?state=context&device_id=' + device, {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
        },
    });

    await fetch('https://api.spotify.com/v1/me/player/play?device_id=' + device, {
        method: 'PUT',
        body: JSON.stringify({
            uris: uriGrab(1),
            position_ms: 0,
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
        },
    });
}

function hashResources(rawData)
{
    for (var k = 0; k < resources.length; k++)
    {
        for (var j = 0; j < resources[k].length; j++)
        {
            switch (j)
            {
                case 0:
                    resources[k][j] =  rawData[k].album.images[0].url;
                    break;
                case 1:
                    resources[k][j] =  rawData[k].name;
                    break;
                case 2:
                    var middle = rawData[k].artists;
                    var final = middle[0].name;
                    for (var x = 1; x < middle.length; x++)
                    {
                        final = final + " - " + middle[x].name;
                    }
                    resources[k][j] = final;
                    break;
                case 3:
                    resources[k][j] = rawData[k].uri;
                    break;
            }
        }
    }

    instateResources(0);
}

function uriGrab(arg)
{
    if (arg < 1)
    {
        arg = 1;
    }

    var buffer = new Array(arg * resources.length);
    var itr = 0;

    for (var i = 0; itr < (arg * resources.length); itr++)
    {
        buffer[itr] = resources[i][3];
        i++;
        if (i > 9)
        {
            i = 0;
        }
    }

    return buffer;
}

function instateResources(index)
{
    clearInterval(nameTick);
    document.getElementById('name-tag').remove();
    document.getElementById('artist-tag').remove();
    var tr = document.createElement('p');
    var ar = document.createElement('p');
    tr.id = 'name-tag';
    tr.classList.add('recc-tag');
    ar.id = 'artist-tag';
    ar.classList.add('recc-tag');
    document.getElementById('name-wrap').appendChild(tr);
    document.getElementById('artist-wrap').appendChild(ar);
    document.getElementById('track-img').src = resources[index][0];
    tr.innerText = resources[index][1];
    ar.innerText = resources[index][2];
    instateDynamicText();
}

function instateDynamicText()
{
    var wraps = document.getElementsByClassName('recc-wrap');
    var tags = document.getElementsByClassName('recc-tag');
    nameTick = setInterval(moveText, 6000);

    for (var i = 0; i < tags.length; i++)
    {
        switch (i)
        {
            case 0:
                if (tags[i].innerText.length > 23)
                {
                    wraps[i].classList.add('text-left');
                }
                else
                {
                    wraps[i].classList.remove('text-left');
                }
                break;
            case 1:
                if (tags[i].innerText.length > 23)
                {
                    wraps[i].classList.add('text-left');
                }
                else
                {
                    wraps[i].classList.remove('text-left');
                }
                break;
        }
    }
}

function moveText()
{
    var text = document.getElementsByClassName('recc-tag');

    for (var k = 0; k < text.length; k++)
    {
        if ((text[k].innerText.length > 23) && (text[k].style.left != '0%'))
        {
            text[k].style.left = '0%';
        }
        else if ((text[k].innerText.length > 23) && (text[k].style.left == '0%'))
        {
            text[k].style.left = '-' + (((text[k].innerText.length / 23) - 1) * 100) + '%';
        }
    }
}

async function toggle()
{
    if (!started)
    {
        started = true;
    }
    await player.togglePlay();
}

async function next()
{
    if (!started)
    {
        started = true;
    }
    await player.nextTrack();
}

async function prev()
{
    if (started)
    {
        await player.previousTrack();
    }
}

function newMessage(arg, incoming, targ)
{
    let messageBox = document.createElement('div');
    let message = document.createElement('p');

    messageBox.classList.add('msg-box');
    message.classList.add('msg');

    if (incoming)
    {
        messageBox.classList.add('incoming-box');
        message.classList.add('incoming-msg');
    }
    else
    {
        messageBox.classList.add('outgoing-box');
        message.classList.add('outgoing-msg');
    }

    message.innerText = arg;
    messageBox.appendChild(message);
    document.getElementsByClassName('msg-display')[targ + 1].appendChild(messageBox);
}

function joinError(message)
{
    var err = document.createElement('p');
    err.classList.add('join-res');
    err.innerText = message;
    document.getElementById('dash-tethers').appendChild(err);
    setTimeout(function() {
        document.getElementsByClassName('join-res')[0].remove();
    }, 7000);
    return err;
}

function newJoinNotif()
{
    var notif = document.getElementById('room-notif');

    if (!notif)
    {
        document.getElementById('roomslabel').innerHTML = 'Rooms<div id = "room-notif">1</div><span class="material-symbols-outlined centered">expand_more</span>';
    }
    else if (notif.innerText == '!')
    {
        return;
    }
    else if (eval(notif.innerText) > 8)
    {
        notif.innerText = '!';
    }
    else
    {
        notif.innerText = eval(notif.innerText + ' + 1');
    }
}

function instateRoom(tar)
{
    var allTitles = document.getElementsByClassName('room-box-title');
    var allDisplays = document.getElementsByClassName('msg-display');
    var x = Rooms.map(object => object.name).indexOf(tar.innerText);
    roomView = x;

    for (var i = 0; i < allTitles.length; i++)
    {
        allTitles[i].classList.remove('highlight');
    }

    for (var k = 1; k < allDisplays.length; k++)
    {
        allDisplays[k].classList.remove('front');
    }

    allDisplays[x + 1].classList.add('front');
    tar.classList.add('highlight');
}

function addRoomBox(arg)
{
    var inQuestion = document.createElement('div');

    inQuestion.classList.add('result-box');
    inQuestion.innerHTML = '<p class = "room-box-title" onclick="instateRoom(this)">'+ arg +'</p>';

    document.getElementById('rooms-dropbox').appendChild(inQuestion);
}

function addRoom(name, host, room)
{
    Rooms.push({name: name, host: host, room: room});
    roomView = Rooms.length - 1;

    var fresh = document.createElement('div');
    fresh.classList.add('msg-display');
    fresh.classList.add('front');
    document.getElementById('dash-hud').appendChild(fresh);

    addRoomBox(name);
    instateRoom(document.getElementsByClassName('room-box-title')[roomView]);
}

async function newRoom()
{
    var roomName = document.getElementById('room-input').value.trim();
    document.getElementById('room-input').value = '';
    
    if (roomName != '')
    {
        for (var i = 0; i < Rooms.length; i++)
        {
            if (Rooms[i].name == roomName)
            {
                joinError('Room names must be unique');
                return;
            }
        }
    }

    let response = await fetch(window.location.origin + '/room',
            { 
                method: 'PUT',
                body: JSON.stringify(
                    {
                        socket: socket.id,
                        name: roomName,
                        user: user
                    }),
                headers:
                {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
    var final = await response.json();
    roomName = final.room_name;

    addRoom(roomName, final.host, final.room_id);
    newJoinNotif();
}