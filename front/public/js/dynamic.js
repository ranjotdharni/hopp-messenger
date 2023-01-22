var session;
var curr = 0;
var started = false;
var resources = new Array(10);
var searchHash = new Array(10);
var Beacons = new Array(10);
var Genres = new Array();
var nameTick;
var artistTick;

window.onload = newSesh;
document.getElementsByClassName('search-input')[0].onkeyup = searchArtists;
document.getElementsByClassName('search-input')[0].onclick = searchArtists;
document.getElementById('togglePlay').onclick = togglePlay;
document.getElementById('prevTrack').onclick = async () =>
{
    if (curr == 0)
    {
        curr = 9;
        await toTrack(curr);
    }
    else
    {
        await toTrack(--curr);
    }
}
document.getElementById('nextTrack').onclick = async () =>
{
    if (curr == 9)
    {
        curr = 0;
        await toTrack(curr);
    }
    else
    {
        await toTrack(++curr);
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
    var middle = await fetch(window.location.origin + '/portal');
    session = await middle.json();

    if (sessionStorage.getItem('token'))
    {
        //window.onSpotifyWebPlaybackSDKReady = instatePlayer;
        document.getElementById('spotify-tag').classList.add('connected');
    }
    else
    {
        //destroyPlayer();
        document.getElementById('spotify-tag').classList.remove('connected');
    }

    await freshHarvest();
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
    instateResources(curr);
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
        document.getElementById('playbtn').innerText = 'play_arrow';
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
    }
}

function connect()
{
    location.href = 'https://accounts.spotify.com/authorize?response_type=code&client_id=646f686836bc44ec98f583414d84a261'
                    + '&scope=streaming%20user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20user-read-playback-position%20user-read-email%20user-read-private%20user-read-playback-position%20user-top-read%20user-read-recently-played%20app-remote-control' 
                    + '&redirect_uri=' + window.location.origin + '/middle&state=9564821374953801';
}

function startMusic()
{
    fetch('https://api.spotify.com/v1/me/player/play?device_id=' + device, {
        method: 'PUT',
        body: JSON.stringify({
            uris: uriGrab(),
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
    curr = 0;

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
                        final = final + "; " + middle[x].name;
                    }
                    resources[k][j] = final;
                    break;
                case 3:
                    resources[k][j] = rawData[k].uri;
                    break;
            }
        }
    }

    instateResources(curr);
}

function uriGrab()
{
    var buffer = new Array(resources.length);

    for (var i = 0; i < resources.length; i++)
    {
        buffer[i] = resources[i][3];
    }

    return buffer;
}

function instateResources(index)
{
    clearInterval(nameTick);
    clearInterval(artistTick);
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

    for (var i = 0; i < tags.length; i++)
    {
        switch (i)
        {
            case 0:
                if (resources[curr][i + 1].length > 23)
                {
                    wraps[i].classList.add('text-left');
                    nameTick = setInterval(moveText, 6000);
                }
                else
                {
                    wraps[i].classList.remove('text-left');
                }
                break;
            case 1:
                if (resources[curr][i + 1].length > 23)
                {
                    wraps[i].classList.add('text-left');
                    artistTick = setInterval(moveText, 6000);
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
        if ((resources[curr][k + 1].length > 23) && (text[k].style.left != '0%'))
        {
            text[k].style.left = '0%';
        }
        else if ((resources[curr][k + 1].length > 23) && (text[k].style.left == '0%'))
        {
            text[k].style.left = '-' + (((resources[curr][k + 1].length / 23) - 1) * 100) + '%';
        }
    }
}

function togglePlayBtn()
{
    if (document.getElementById('playbtn').innerText == 'pause')
    {
        document.getElementById('playbtn').innerText = 'play_arrow';
    }
    else
    {
        document.getElementById('playbtn').innerText = 'pause';
    }
}

async function togglePlay()
{
    if (!started)
    {
        started = true;
        fetch('https://api.spotify.com/v1/me/player/play?device_id=' + device, {
            method: 'PUT',
            body: JSON.stringify({
                uris: [resources[curr][3]],
                position_ms: 0,
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
            },
        });
        
        document.getElementById('playbtn').innerText = 'pause';
    }
    else
    {
        player.togglePlay();
        togglePlayBtn();
    }
}

async function toTrack(arg)
{
    if (started)
    {
        fetch('https://api.spotify.com/v1/me/player/play?device_id=' + device, {
            method: 'PUT',
            body: JSON.stringify({
                uris: [resources[arg][3]],
                position_ms: 0,
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
            },
        });

        instateResources(arg);
        document.getElementById('playbtn').innerText = 'pause';
    }
    else
    {
        instateResources(arg);
        document.getElementById('playbtn').innerText = 'play_arrow';
    }
}