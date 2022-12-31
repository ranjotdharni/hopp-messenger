var session;
var resources = new Array(6);
var bgMarker = 0;
var feMarker = 0;
var feOffset = 0;
var previous;
setInterval(refreshBG, 10000);
setInterval(refreshFE, 8000);

window.onload = newSesh;

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

    console.log('Instantiating fresh resources...');
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
    rawData = final.albums;

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

    var makeFront = document.getElementsByClassName('dynamic-image');

    for (var i = 0; i < makeFront.length; i++)
    {
        makeFront[i].src = resources[i][0];
    }

    document.getElementsByClassName('lightbar-bottom')[feMarker].classList.add('lightbar-anim');
    newText = document.getElementsByClassName('textbox');

    for (var z = 0; z < newText.length; z++)
    {
        newText[z].classList.add('textfade');
        newText[z].innerText = resources[feMarker][z + 1];
        newText[z].classList.remove('textfade');
    }

    var temp = document.getElementsByClassName('dynamic-bg-image');
    
    temp[0].src = resources[bgMarker++][0];
    temp[1].src = resources[bgMarker++][0];
    temp[2].src = resources[bgMarker++][0];
    temp[0].classList.remove('slideIn');
    temp[0].classList.remove('fader');
    temp[1].classList.remove('slideIn');
    temp[1].classList.remove('fader');
    temp[2].classList.remove('slideIn');
    temp[2].classList.remove('fader');

    for (var show = 0; show < resources.length; show++)
    {
        for (var inShow = 0; inShow < resources[show].length; inShow++)
        {
            console.log(resources[show][inShow]);
        }
    }

}

function refreshBG()
{
    if (!(bgMarker < resources.length))
    {
        bgMarker = 0;
    }

    var temp = document.getElementsByClassName('dynamic-bg-image');
    temp[0].classList.add('fader');
    temp[0].classList.add('slideIn');
    temp[1].classList.add('fader');
    temp[1].classList.add('slideIn');
    temp[2].classList.add('fader');
    temp[2].classList.add('slideIn');


    setTimeout(function() {
        temp[0].src = resources[bgMarker++][0];
        temp[1].src = resources[bgMarker++][0];
        temp[2].src = resources[bgMarker++][0];

        temp[0].classList.remove('slideIn');
        temp[0].classList.remove('fader');
        temp[1].classList.remove('slideIn');
        temp[1].classList.remove('fader');
        temp[2].classList.remove('slideIn');
        temp[2].classList.remove('fader');
    }, 2000);
}

function refreshFE()
{
    var newText = document.getElementsByClassName('textbox');
    for (var z = 0; z < newText.length; z++)
    {
        newText[z].classList.add('textfade');
    }
    setDynamic(1);
}

function setDynamic(i)
{
    var newText = document.getElementsByClassName('textbox');
    var middle = document.getElementsByClassName('dynamic-image');
    var lightMiddle = document.getElementsByClassName('lightbar-bottom');
    previous = feMarker;

    lightMiddle[previous].classList.remove('lightbar-anim');

    if (i < 0)
    {
        if (feMarker == 0)
        {
            feMarker = 5;
        }
        else
        {
            feMarker--;
        }

        if (feOffset == 0)
        {
            feOffset = 500;

            for (var x = 0; x < middle.length; x++)
            {
                middle[x].style.left = '-' + feOffset + '%';
            }
        }
        else
        {
            feOffset = feOffset - 100;

            for (var x = 0; x < middle.length; x++)
            {
                middle[x].style.left = '-' + feOffset + '%';
            }
        }
    }
    else
    {
        if (feMarker == 5)
        {
            feMarker = 0;
        }
        else
        {
            feMarker++;
        }

        if (feOffset == 500)
        {
            feOffset = 0;

            for (var x = 0; x < middle.length; x++)
            {
                middle[x].style.left = feOffset + '%';
            }
        }
        else
        {
            feOffset = feOffset + 100;

            for (var x = 0; x < middle.length; x++)
            {
                middle[x].style.left = '-' + feOffset + '%';
            }
        }
    }

    for (var z = 0; z < newText.length; z++)
    {
        newText[z].innerText = resources[feMarker][z + 1];
        newText[z].classList.remove('textfade');
    }

    lightMiddle[feMarker].classList.add('lightbar-anim');
}