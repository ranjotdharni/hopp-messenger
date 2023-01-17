var session;
var resources = new Array(6);
var searchHash = new Array(10);
var Beacons = new Array(10);
var Genres = new Array();

window.onload = newSesh;
document.getElementsByClassName('search-input')[0].onkeyup = searchArtists;
document.getElementsByClassName('search-input')[0].onclick = searchArtists;
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
        resources[i] = new Array(5);
    }

    let buffer = await fetch("https://api.spotify.com/v1/albums?ids=4lPh818nqtqiPwqOGEGA1b%2C2ODvWsOgouMbaA5xf0RkJe" 
        + "%2C0MV1yCXcNNQBfwApqAVkH0%2C79dL7FLiJFOO0EoehUHQBv" 
        + "%2C4vLYreWxd2ptOAzPwTyBI3%2C5Gm2XKBgnlzd6qTi7LE1z2&market=US", {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.session_key,
        },
    });

    var final = await buffer.json();
    var rawData = final.albums;

    for (var k = 0; k < resources.length; k++)
    {
        for (var j = 0; j < resources[k].length; j++)
        {
            switch (j)
            {
                case 0:
                    resources[k][j] =  rawData[k].images[0].url;
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
                    resources[k][j] = rawData[k].release_date;
                    break;
                case 4:
                    resources[k][j] = rawData[k].label;
                    break;
            }
        }
    }

    instateBeacons();
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
        errBeacon('Please add at least 1 beacon.');
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
        console.log(final);
    }
}