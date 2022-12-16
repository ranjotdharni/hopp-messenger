const loginform = document.getElementById('loginform');
const createform = document.getElementById('createform');
const checks = document.querySelectorAll('#validdash li i');

window.onload = checkSesh;
createform.onsubmit = handleCreate;
loginform.onsubmit = handleLogin;
document.getElementById('createuser').addEventListener('input', flagBurn);
document.getElementById('createpass').addEventListener('input', flagBurn);
document.getElementById('createreenter').addEventListener('input', flagBurn);

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

    if (final.status != 400)
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

    final = await response.json();

    if (final.status != 400)
    {
        await login(u, p);
    }
    else
    {
        console.log(final.message);
    }
}

async function checkSesh()
{   
    flagBurn();

    const cookieD = await fetch(window.location.origin + '/home');
    const final = await cookieD.text();

    if (final.includes('This is the Hopp main page; welcome.'))
    {
        location.href = window.location.origin + '/home';
    }
}