var session;
var connected = false;
var nonPre = false;
var started = false;
var resources = new Array(10);
var searchHash = new Array(10);
var Beacons = new Array(4);
var Genres = new Array();
var Rooms = new Array();
var Inbox = new Array();
var Friends = new Array();
var nameTick;
var roomView = -1;
var roomClassifier = 0;
let user = null;

window.onload = async function()
{
    await newSesh();
};

async function refreshToken()
{
    console.log('Refreshing Access Token...');
    console.log('Expired Token: ' + sessionStorage.getItem('token'));
    var buffer = await fetch(window.location.origin + '/request',
    {
        method: 'POST',
        body: JSON.stringify(
            {
                refresh: sessionStorage.getItem('refresh'),
            }),
        headers:
        {
            'Content-type': 'application/json; charset=UTF-8',
        }
    });
    var final = await buffer.json();

    if (final.error)
    {
        console.log(final.error);
    }
    else
    {
        sessionStorage.removeItem('token');
        sessionStorage.setItem('token', final.token);
        console.log('Refreshed Access Token: ' + sessionStorage.getItem('token'));
    }
}

document.getElementsByClassName('search-input')[0].onkeyup = searchArtists;
document.getElementsByClassName('search-input')[0].onclick = searchArtists;
document.getElementById('togglePlay').onclick = toggle;
document.getElementById('create-btn').onclick = newRoom;
document.getElementById('public').onclick = () =>
{
    if (roomClassifier == 0)
    {
        return;
    }
    else
    {
        document.getElementById('private').classList.remove('chosenClass');
        document.getElementById('public').classList.add('chosenClass');
        roomClassifier = 0;
    }
}
document.getElementById('private').onclick = () =>
{
    if (roomClassifier == 1)
    {
        return;
    }
    else
    {
        document.getElementById('public').classList.remove('chosenClass');
        document.getElementById('private').classList.add('chosenClass');
        roomClassifier = 1;
    }
}
document.getElementById('user-invite-button').onclick = genInvite;
document.getElementById('user-add-button').onclick = async () =>
{
    const query = document.getElementById('user-search-input').value.trim();
    document.getElementById('user-search-input').value = '';
    let branch = await fetch(window.location.origin + '/friend',
            { 
                method: 'POST',
                body: JSON.stringify(
                    {
                        user: user,
                        query: query
                    }),
                headers:
                {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
    let tree = await branch.json();
    
    if (tree.error)
    {
        joinError(tree.error);
    }
    else
    {
        joinError(tree.message);
    }
}
document.getElementById('roomslabel').onclick = () =>
{
    if (document.getElementById('room-notif'))
    {
        document.getElementById('room-notif').remove();
    }
}
document.getElementById('prevTrack').onclick = async () =>
{
    if (!connected && !nonPre)
    {
        return;
    }
    else if (nonPre)
    {
        connError('This functionality is restricted to Spotify Premium Users.');
    }
    else
    {
        await prev();
    }
}
document.getElementById('nextTrack').onclick = async () =>
{
    if (!connected && !nonPre)
    {
        return;
    }
    else if (nonPre)
    {
        connError('This functionality is restricted to Spotify Premium Users.');
    }
    else
    {
        await next();
    }
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
    else if (Rooms.length > 9)
    {
        joinError('Room Limit Reached');
        return;
    }

    var buffer = await fetch(window.location.origin + '/room',
    {
        method: 'POST',
        body: JSON.stringify(
            {
                socket: entry,
            }),
        headers:
        {
            'Content-type': 'application/json; charset=UTF-8',
        }
    });
    var final = await buffer.json();

    if (final.error)
    {
        joinError(final.error);
    }
    else
    {
        socket.emit('joining', final.room_id, user);
        addRoom(final.name, final.host, final.room_id, final.private);
    }
}

document.getElementById('logout-button').onclick = async () =>
{
    document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    sessionStorage.clear();

    await fetch(window.location.origin + '/logout',
            { 
                method: 'PUT',
                body: JSON.stringify(
                    {
                        user: user
                    }),
                headers:
                {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });

    location.href = window.location.origin + '/';
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
        document.getElementById('username-display').innerText = user;
        let alc = await fetch(window.location.origin + '/live',
            { 
                method: 'POST',
                body: JSON.stringify(
                    {
                        socket: socket.id,
                        user: user
                    }),
                headers:
                {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });

        let jimbean = await alc.json();
        var fr = jimbean.friends;
        var pr = jimbean.publics;

        for (let i = 0; i < fr.length; i++)
        {
            newInboxRequest(fr[i].username, '0');
        }

        for (let j = 0; j < pr.length; j++)
        {
            publicRoom(pr[j].username, pr[j].room_id);
        }
    }
}

async function expSession()
{
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

    let result = await buffer.json();

    if (result.error)
    {
        console.log(result.error);
        return true;
    }
    else
    {
        return false;
    }
}

async function instateSession()
{
    if ((session == undefined) || await expSession())
    {
        var middle = await fetch(window.location.origin + '/portal');
        session = await middle.json();
    }
}

async function parseFriends()
{
    let branch = await fetch(window.location.origin + '/friendlist',
        { 
            method: 'POST',
            body: JSON.stringify(
                {
                    username: user
                }),
            headers:
            {
                'Content-type': 'application/json; charset=UTF-8',
            }
        });
    let tree = await branch.json();
    let online = tree.live;
    let offline = tree.sleep;
    console.log(tree);
    
    for (let x = 0; x < online.length; x++)
    {
        if (online[x].username != user && online[x].username != null)
        {
            newFriend(online[x].username, 1);
        }
    }
    for (let z = 0; z < offline.length; z++)
    {
        if (offline[z].username != user && offline[z].username != null)
        {
            newFriend(offline[z].username, 0);
        }
    }
}

async function searchArtists()
{
    await instateSession();

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
    let images = document.getElementsByClassName('artist-result-img');

    for (var i = 0; i < boxes.length; i++)
    {
        searchHash[i].Sid = (result[i].id);
        searchHash[i].Sname = (result[i].name);
        searchHash[i].Stype = (result[i].type);
        searchHash[i].Simg = (result[i].images[2].url);
        images[i].src = searchHash[i].Simg;

        if (result[i].name.length > 21)
        {
            boxes[i].innerText = ((result[i].name.slice(0, 18) + '...') || '');
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
    await instateSession();

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
    let images = document.getElementsByClassName('track-result-img');

    for (var i = 0; i < boxes.length; i++)
    {
        searchHash[i].Sid = (result[i].id);
        searchHash[i].Sname = (result[i].name);
        searchHash[i].Stype = (result[i].type);
        searchHash[i].Simg = (result[i].album.images[2].url);
        images[i].src = searchHash[i].Simg;

        if(result[i].name.length > 21)
        {
            boxes[i].innerText = ((result[i].name.slice(0, 18) + '...') || '');
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
    await instateSession();
    await parseFriends();

    if (sessionStorage.getItem('token') && !(nonPre))
    {
        document.getElementById('status-circle').classList.add('connected');
        document.getElementById('playbtn').classList.remove('dimmed');
        document.getElementById('prevbtn').classList.remove('dimmed');
        document.getElementById('nextbtn').classList.remove('dimmed');
        document.getElementById('connectbtn').classList.add('dimmed');
        connected = true;
    }
    else if (nonPre)
    {
        document.getElementById('status-circle').classList.remove('connected');
        document.getElementById('status-circle').classList.add('nonPre');
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
        searchHash[j] = {Sname: '', Sid: '', Stype: '', Simg: ''};

        if (j < Beacons.length)
        {
            Beacons[j] = {name: '', id: '', type: '', img: ''};
        }
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
                Beacons[i].img = searchHash[arg].Simg;
                instateBeacons();
                return;
            }
        }

        errBeacon('Beacon limit reached.');
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
        Beacons.push({name: '', id: '', type: '', img: ''});
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
    var branch = document.getElementsByClassName('beacon-result-img');

    for (var i = 0; i < middle.length; i++)
    {
        let buffer = Beacons[i].name;
        let tree = Beacons[i].img;

        if (buffer.length > 18)
        {
            middle[i].innerText = buffer.slice(0, 15) + '...';
        }
        else
        {
            middle[i].innerText = buffer;
        }

        if (tree == '')
        {
            branch[i].src = '/svg/dna.svg';
        }
        else
        {
            branch[i].src = tree;
        }
    }
}

function errBeacon(arg)
{
    var hubris = document.createElement('p');
    hubris.innerText = arg;
    hubris.classList.add('control-error');
    document.getElementById('dash-control').appendChild(hubris);

    setTimeout(function() {
        hubris.classList.add('fade-error');
    }, 7000);
    setTimeout(function () {
        hubris.remove();
    }, 8000);
}

async function fireBeacons()
{
    await instateSession();

    var artists = 0;
    var tracks = 0;

    if (!connected)
    {
        errBeacon('First connect to your Spotify account below.');
        return;
    }
    else if (Genres.length == 0)
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

async function connect()
{
    if (connected)
    {
        return;
    }

    location.href = 'https://accounts.spotify.com/authorize?response_type=code&client_id=646f686836bc44ec98f583414d84a261'
                    + '&scope=streaming%20user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20user-read-playback-position%20user-read-email%20user-read-private%20user-read-playback-position%20user-top-read%20user-read-recently-played%20app-remote-control' 
                    + '&redirect_uri=' + window.location.origin + '/middle&state=9564821374953801';
}

async function instateMusic()
{
    try
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
    catch (error)
    {
        if (error.status == 401)
        {
            console.log(error);
            await refreshToken();
            await instateMusic();
        }
        else
        {
            console.log(error);
            return;
        }
    }
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
    if (!connected && !nonPre)
    {
        return;
    }
    else if (nonPre)
    {
        connError('This functionality is restricted to Spotify Premium Users.');
        return;
    }
    
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

function newMessage(arg, incoming, targ, from)
{
    let messageBox = document.createElement('div');
    let senderBox = document.createElement('div');
    let message = document.createElement('p');
    let sender = document.createElement('p');

    messageBox.classList.add('msg-box');
    messageBox.classList.add('msg-margin');
    senderBox.classList.add('msg-box');
    message.classList.add('msg');
    sender.classList.add('msg-sender');

    if (incoming)
    {
        messageBox.classList.add('incoming-box');
        senderBox.classList.add('incoming-box');
        sender.classList.add('msg-flip-left');
        message.classList.add('incoming-msg');
    }
    else
    {
        messageBox.classList.add('outgoing-box');
        senderBox.classList.add('outgoing-box');
        message.classList.add('outgoing-msg');
    }

    sender.innerText = from + ' ' + new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    message.innerText = arg;
    senderBox.appendChild(sender);
    messageBox.appendChild(message);
    document.getElementsByClassName('msg-display')[targ + 1].appendChild(senderBox);
    document.getElementsByClassName('msg-display')[targ + 1].appendChild(messageBox);
}

function notifMessage(from, incoming, targ, action)
{
    let senderBox = document.createElement('div');
    let sender = document.createElement('p');
    senderBox.classList.add('msg-box');
    sender.classList.add('msg-sender');

    if (incoming)
    {
        senderBox.classList.add('incoming-box');
        sender.classList.add('msg-flip-left');
    }
    else
    {
        senderBox.classList.add('outgoing-box');
    }

    if (action == 1)
    {
        sender.classList.add('joined');
        sender.innerText = from + ' joined @ ' + new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    }
    else
    {
        sender.classList.add('left');
        sender.innerText = from + ' left @ ' + new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    }
    
    senderBox.appendChild(sender);
    document.getElementsByClassName('msg-display')[targ + 1].appendChild(senderBox);
}

function joinError(message)
{
    var err = document.createElement('p');
    err.classList.add('join-res');
    err.innerText = message;
    document.getElementById('dash-tethers').appendChild(err);
    setTimeout(function() {
        document.getElementsByClassName('join-res')[0].classList.add('fade-error');
    }, 7000);
    setTimeout(function() {
        document.getElementsByClassName('join-res')[0].remove();
    }, 8000);
    return err;
}

function connError(message)
{
    var err = document.createElement('p');
    err.classList.add('conn-error');
    err.innerText = message;
    document.getElementById('dash-recc').appendChild(err);
    setTimeout(function() {
        document.getElementsByClassName('conn-error')[0].classList.add('fade-error');
    }, 7000);
    setTimeout(function() {
        document.getElementsByClassName('conn-error')[0].remove();
    }, 8000);
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

function dropRoom(roombox, name)
{
    var targetIndex = Rooms.map(object => object.name).indexOf(name);
    if (Rooms[targetIndex].host == socket.id)
    {
        socket.emit('drop-room', Rooms[targetIndex].room);
    }
    else
    {
        socket.emit('exit-room', Rooms[targetIndex].room, user);
    }
    
    roombox.remove();
    document.getElementsByClassName('msg-display')[targetIndex + 1].remove();
    Rooms.splice(targetIndex, 1);

    if (Rooms.length == 0)
    {
        document.getElementById('name-view').innerText = '';
        document.getElementById('room-view').innerText = '';
        document.getElementById('host-icon').classList.remove('is-host');
        roomView = -1;
    }
    else if (roomView == targetIndex)
    {
        if (targetIndex != 0)
        {
            instateRoom(document.getElementsByClassName('room-box-title')[targetIndex - 1]);
        }
        else
        {
            instateRoom(document.getElementsByClassName('room-box-title')[targetIndex]);
        }
    }
    else if (roomView > targetIndex)
    {
        roomView--;
    }
}

function instateRoom(tar)
{
    var allTitles = document.getElementsByClassName('room-box-title');
    var allDisplays = document.getElementsByClassName('msg-display');
    var x = Rooms.map(object => object.name).indexOf(tar.innerText);
    roomView = x;

    document.getElementById('name-view').innerText = Rooms[x].name;

    if (Rooms[x].private != 1)
    {
        document.getElementById('room-view').innerText = Rooms[x].room;
    }
    else
    {
        document.getElementById('room-view').innerText = '';
    }
    
    if (socket.id == Rooms[x].host)
    {
        document.getElementById('host-icon').classList.remove('is-host');
        document.getElementById('host-icon').classList.add('is-host');
    }
    else
    {
        document.getElementById('host-icon').classList.remove('is-host');
    }

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

function addRoomBox(arg, host)
{
    var inQuestion = document.createElement('div');
    var theText = document.createElement('p');
    var theBtn = document.createElement('button');

    inQuestion.classList.add('result-box');
    inQuestion.classList.add('room-box');
    theText.classList.add('room-box-title');
    theText.setAttribute('onclick', 'instateRoom(this)');
    theText.innerText = arg;
    theBtn.classList.add('drop-room-btn');
    theBtn.innerHTML = '<span class="material-symbols-outlined">delete_forever</span>';
    inQuestion.appendChild(theText);
    inQuestion.appendChild(theBtn);
    if (host)
    {
        var crown = document.createElement('img');
        crown.classList.add('host');
        crown.src = '/svg/crown.svg';
        inQuestion.appendChild(crown);
    }

    document.getElementById('rooms-dropbox').appendChild(inQuestion);
    theBtn.addEventListener('click', function() {
        dropRoom(inQuestion, arg);
    });
}

function addRoom(name, host, room, private)
{
    Rooms.push({name: name, host: host, room: room, private: private});
    roomView = Rooms.length - 1;
    var isHost = false;

    if (host == socket.id)
    {
        isHost = true;
    }

    var fresh = document.createElement('div');
    fresh.classList.add('msg-display');
    fresh.classList.add('front');
    document.getElementById('dash-hud').appendChild(fresh);


    addRoomBox(name, isHost);
    instateRoom(document.getElementsByClassName('room-box-title')[roomView]);
    newJoinNotif();
}

async function newRoom()
{
    var roomName = document.getElementById('room-input').value.trim();
    document.getElementById('room-input').value = '';
    if (Rooms.length > 9)
    {
        joinError('Room Limit Reached.');
        return;
    }
    else if (roomName.length > 30)
    {
        joinError('Room Nickname must be 30 characters or less.');
        return;
    }
    
    if (roomName != '')
    {
        for (var i = 0; i < Rooms.length; i++)
        {
            if (Rooms[i].name == roomName)
            {
                joinError('Nicknames must be locally unique');
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
                        user: user,
                        live: roomClassifier
                    }),
                headers:
                {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
    var final = await response.json();
    roomName = final.room_name;

    socket.emit('joining', final.room_id, user);
    addRoom(roomName, final.host, final.room_id, final.private);
}

function newInboxRequest(from, type)
{
    if (type == '0')
    {
        var newBox = document.createElement('div');
        newBox.classList.add('inbox-box');
        newBox.innerHTML = '<span class="material-symbols-outlined inbox-type">handshake</span><span class="material-symbols-outlined inbox-icon">person</span><span class = "first">'
                            + from + `</span><span class = "last">Sent you a friend request!</span><button class = "inbox-btn1 inbox-btn" onclick="acceptRequest('`
                            + from + `', '` + type + `')">Accept</button><button class = "inbox-btn2 inbox-btn" onclick="declineRequest('`
                            + from + `', '` + type + `')">Decline</button>`;
    
        document.getElementById('inbox-list').appendChild(newBox);
        Inbox.push({from: from, type: type, node: newBox});
    }
    else
    {
        if (Inbox.map(object => object.type).indexOf(type) != -1)
        {
            return;
        }

        var newBox = document.createElement('div');
        newBox.classList.add('inbox-box');
        newBox.innerHTML = '<span class="material-symbols-outlined inbox-type">supervised_user_circle</span><span class="material-symbols-outlined inbox-icon">person</span><span class = "first">'
                            + from + `</span><span class = "last">Sent you a room invite!</span><button class = "inbox-btn1 inbox-btn" onclick="acceptRequest('`
                            + from + `', '` + type + `')">Accept</button><button class = "inbox-btn2 inbox-btn" onclick="declineRequest('`
                            + from + `', '` + type + `')">Decline</button>`;
    
        document.getElementById('inbox-list').appendChild(newBox);
        Inbox.push({from: from, type: type, node: newBox});
    }
}

function publicRoom(from, type)
{
    if (Inbox.map(object => object.type).indexOf(type) != -1)
    {
        return;
    }

    var newBox = document.createElement('div');
    newBox.classList.add('inbox-box');
    newBox.innerHTML = '<span class="material-symbols-outlined inbox-type">add_home</span><span class="material-symbols-outlined inbox-icon">person</span><span class = "first">'
                        + from + `</span><span class = "last">Started a public room!</span><button class = "inbox-btn1 inbox-btn" onclick="acceptRequest('`
                        + from + `', '` + type + `')">Join</button><button class = "inbox-btn2 inbox-btn" onclick="declineRequest('`
                        + from + `', '` + type + `')">Clear</button>`;
    
    document.getElementById('inbox-list').appendChild(newBox);
    Inbox.push({from: from, type: type, node: newBox});
    console.log(Inbox);
}

function newFriend(friend, live)
{
    var online = '';
    if (live != 1)
    {
        online = ' not-online';
    }

    var friendBox = document.createElement('div');
    friendBox.classList.add('friends-box');
    friendBox.innerHTML = '<span class="material-symbols-outlined friends-box-icon">person</span><span class = "friends-user">' 
                           + friend + '</span><span class="material-symbols-outlined friends-box-status'
                           + online + `">vital_signs</span><button class = "friends-box-btn" onclick="fireInvite('`
                           + friend + `')">Invite</button><span class="material-symbols-outlined friends-box-delete" onclick="dropFriend('`
                           + friend + `')">close</span>`;
    document.getElementById('friends-box-list').appendChild(friendBox);
    Friends.push({friend: friend, live: live, node: friendBox});
}

async function acceptRequest(w, x)
{
    if (x == '0')
    {
        for (let c = 0; c < Inbox.length; c++)
        {
            if ((Inbox[c].from == w) && (Inbox[c].type == x))
            {
                x = c;
                break;
            }
        }
    }
    else
    {
        x = Inbox.map(object => object.type).indexOf(x);
    }

    if (Inbox[x].type == '0')
    {
        let branch = await fetch(window.location.origin + '/friend',
        { 
            method: 'PUT',
            body: JSON.stringify(
                {
                    sender: Inbox[x].from,
                    accept: user
                }),
            headers:
            {
                'Content-type': 'application/json; charset=UTF-8',
            }
        });
        let tree = await branch.json(); 

        Inbox[x].node.remove();
        Inbox.splice(x, 1);
        newFriend(tree.friend, tree.live);
        joinError('Request from ' + tree.friend + ' accepted.');
    }
    else
    {
        if (Rooms.length > 9)
        {
            joinError('Room List at capacity.');
            Inbox[x].node.remove();
            Inbox.splice(x, 1);
            console.log(Inbox);
            return;
        }

        let branch = await fetch(window.location.origin + '/invite',
        { 
            method: 'PUT',
            body: JSON.stringify(
                {
                    room: Inbox[x].type
                }),
            headers:
            {
                'Content-type': 'application/json; charset=UTF-8',
            }
        });
        let tree = await branch.json();

        Inbox[x].node.remove();
        Inbox.splice(x, 1);
        if (tree.error)
        {
            joinError(tree.error);
        }
        else
        {
            socket.emit('accept-invite', user, tree.room_id);
            addRoom(tree.name, tree.host, tree.room_id, tree.private);
            joinError(tree.message);
        }
    }

    console.log(Inbox);
}

async function declineRequest(w, x)
{
    if (x == '0')
    {
        for (let c = 0; c < Inbox.length; c++)
        {
            if ((Inbox[c].from == w) && (Inbox[c].type == x))
            {
                x = c;
                break;
            }
        }
    }
    else
    {
        x = Inbox.map(object => object.type).indexOf(x);
    }
    console.log(Inbox);
    console.log('At Index: ' + x)
    if (Inbox[x].type == '0')
    {
        await fetch(window.location.origin + '/deadrequest',
        { 
            method: 'DELETE',
            body: JSON.stringify(
                {
                    from: Inbox[x].from
                }),
            headers:
            {
                'Content-type': 'application/json; charset=UTF-8',
            }
        });
    }

    Inbox[x].node.remove();
    Inbox.splice(x, 1);
    console.log(Inbox);
}

async function genInvite()
{
    const query = document.getElementById('user-search-input').value.trim();
    document.getElementById('user-search-input').value = '';
    let branch = await fetch(window.location.origin + '/invite',
    { 
        method: 'POST',
        body: JSON.stringify(
            {
                from: user,
                to: query,
                type: Rooms[roomView].room
            }),
        headers:
        {
            'Content-type': 'application/json; charset=UTF-8',
        }
    });
    let tree = await branch.json();

    if (tree.error)
    {
        joinError(tree.error);
    }
    else
    {
        joinError(tree.message);
    }
}

async function fireInvite(x)
{
    x = Friends.map(object => object.friend).indexOf(x)

    if (Friends[x].live == 0)
    {
        joinError('User not live.');
    }
    else
    {
        let branch = await fetch(window.location.origin + '/invite',
            { 
                method: 'POST',
                body: JSON.stringify(
                    {
                        from: user,
                        to: Friends[x].friend,
                        type: Rooms[roomView].room
                    }),
                headers:
                {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
        let tree = await branch.json();

        if (tree.error)
        {
            joinError(tree.error);
        }
        else
        {
            joinError(tree.message);
        }
    }
}

async function dropFriend(x)
{
    x = Friends.map(object => object.friend).indexOf(x);
    await fetch(window.location.origin + '/friend',
    { 
        method: 'DELETE',
        body: JSON.stringify(
            {
                username: user,
                drop: Friends[x].friend
            }),
        headers:
        {
            'Content-type': 'application/json; charset=UTF-8',
        }
    });
    Friends[x].node.remove();
    Friends.splice(x, 1);
}