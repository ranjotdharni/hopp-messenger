const loginform = document.getElementById('loginform');
const createform = document.getElementById('createform');
const checks = document.querySelectorAll('#validdash li i');

window.onload = checkSesh;
createform.onsubmit = handleCreate;
loginform.onsubmit = handleLogin;
document.getElementById('createuser').addEventListener('input', flagBurn);
document.getElementById('createpass').addEventListener('input', flagBurn);
document.getElementById('createreenter').addEventListener('input', flagBurn);
setTimeout(function() {
    document.getElementById("window").classList.remove("fadeaway");
}, 500);
document.getElementById('recoverbutton').onclick = async () =>
{
    await makeGuest();
}

var session;

function flagBurn()
{
    if (createform.elements.createuser.value.trim() == createform.elements.createpass.value.trim())
    {
        checks[0].style.color = 'red';
        checks[0].innerText = 'close';
    }
    else
    {
        checks[0].style.color = 'darkgreen';
        checks[0].innerText = 'done';
    }

    if (createform.elements.createpass.value.trim() != createform.elements.createreenter.value.trim())
    {
        checks[1].style.color = 'red';
        checks[1].innerText = 'close';
    }
    else
    {
        checks[1].style.color = 'darkgreen';
        checks[1].innerText = 'done';
    }

    if (createform.elements.createuser.value.trim().length < 8 || createform.elements.createpass.value.trim().length < 8)
    {
        checks[2].style.color = 'red';
        checks[2].innerText = 'close';
    }
    else
    {
        checks[2].style.color = 'darkgreen';
        checks[2].innerText = 'done';
    }

    if (createform.elements.createuser.value.trim().length > 24 || createform.elements.createpass.value.trim().length > 24)
    {
        checks[3].style.color = 'red';
        checks[3].innerText = 'close';
    }
    else
    {
        checks[3].style.color = 'darkgreen';
        checks[3].innerText = 'done';
    }
}

async function handleLogin(event)
{
    event.preventDefault();

    if(loginform.elements.loginuser.value.trim().length == 0 || loginform.elements.loginpass.value.trim().length == 0)
    {
        return
    }

    var user = loginform.elements.loginuser.value;
    var pass = loginform.elements.loginpass.value;
    await login(user, pass);
}

async function handleCreate(event)
{
    event.preventDefault();

    if (createform.elements.createuser.value.trim() == createform.elements.createpass.value.trim())
    {
        return
    }

    if (createform.elements.createpass.value.trim() != createform.elements.createreenter.value.trim())
    {
        return
    }

    if (createform.elements.createuser.value.trim().length < 8 || createform.elements.createpass.value.trim().length < 8)
    {
        return
    }

    if (createform.elements.createuser.value.trim().length > 24 || createform.elements.createpass.value.trim().length > 24)
    {
        return
    }

    var user = createform.elements.createuser.value;
    var pass = createform.elements.createpass.value;
    await create(user, pass);
}

async function login(u, p)
{
        const response = await fetch(window.location.origin + '/portal',
            { 
                method: 'PUT',
                body: JSON.stringify(
                    {
                        username:u,
                        password:p,
                    }),
                headers:
                {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });

    const final = await response.json();

    if (final.status != 401)
    {
        location.href = window.location.origin + '/home';
    }
    else
    {
        console.log(final.message);
    }
}

async function create(u, p)
{
    const response = await fetch(window.location.origin + '/portal',
        {
            method: 'POST',
            body: JSON.stringify(
                {
                    username:u,
                    password:p,
                }),
            headers:
            {
                'Content-type': 'application/json; charset=UTF-8',
            }
        });

    var final = await response.json();

    if (final.status != 401)
    {
        await login(u, p);
    }
    else
    {
        console.log(final.message);
    }
} 

async function makeGuest()
{
    const response = await fetch(window.location.origin + '/guest',
        {
            method: 'POST',
            headers:
            {
                'Content-type': 'application/json; charset=UTF-8',
            }
        });

    var middle = await response.json();

    var almost = await fetch(window.location.origin + '/guest',
    { 
        method: 'PUT',
        body: JSON.stringify(
            {
                username: middle.guest_user,
            }),
        headers:
        {
            'Content-type': 'application/json; charset=UTF-8',
        }
    });

    var final = await almost.json();

    if (final.status == 200)
    {
        location.href = window.location.origin + '/home';
    }
}

async function checkSesh()
{   
    flagBurn();

    var middle = await fetch(window.location.origin + '/portal');
    session = await middle.json();

    const textHTML = await fetch(window.location.origin + '/home');
    const final = await textHTML.text();

    if (final.includes('<link rel = "stylesheet" href = "/css/dash.css">'))
    {
        location.href = window.location.origin + '/home';
    }

    await getResource();
}

async function getResource()
{
    console.log('fetching resources...');
    let buffer = await fetch("https://api.spotify.com/v1/albums/4yP0hdKOZPNshxUOjY0cZj?market=US", {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.session_key,
        },
    });

    var final = await buffer.json();
}