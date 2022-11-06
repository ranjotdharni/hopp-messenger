const createBtn = document.getElementById('createbutton');
const form = document.getElementById('loginform');

const requestURL_heroku = 'https://hopp-messenger.herokuapp.com/portal';
const requestURL_local = 'http://localhost:8080/portal';
const homeURL_heroku = 'https://hopp-messenger.herokuapp.com/home';
const homeURL_local = 'http://localhost:8080/home';

var createFlag = false;

createBtn.onclick = updateFlag;
form.onsubmit = handleSubmit;

function updateFlag(event)
{   
    createFlag = true;
}

async function handleSubmit(event)
{
    event.preventDefault();

    var user = form.elements.userinput.value;
    var pass = form.elements.passwordinput.value;

    if (createFlag)
    {       
        createFlag = false;
        await create(user, pass);
    }
    else
    {
        await login(user, pass);
    }
    
}

async function login(u, p)
{
        const response = await fetch(requestURL_heroku,
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
        location.href = homeURL_local;
    }
    else
    {
        console.log(final.message);
    }
}

async function create(u, p)
{
    const response = await fetch(requestURL_heroku,
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