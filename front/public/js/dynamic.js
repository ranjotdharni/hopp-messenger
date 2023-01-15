var session;
var resources = new Array(6);

window.onload = newSesh;
document.getElementsByClassName('search-input')[0].onkeyup = async () => 
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
        boxes[i].innerText = (result[i].name || '');
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

    /*var makeBG = document.getElementsByClassName('bg-image');

    for (var i = 0; i < makeBG.length; i++)
    {
        makeBG[i].src = resources[i][0]
    }*/
}