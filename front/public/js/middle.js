let URLparams = new URLSearchParams(window.location.search);

if (URLparams.has('code'))
{
    let code = URLparams.get('code');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh');
    freshToken(code, (window.location.origin + '/middle'));
}
else if (URLparams.has('error'))
{
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh');
    location.href = window.location.origin + '/home';
}
else
{
    location.href = window.location.origin + '/home';
}

async function freshToken(code, uri)
{
    var middle = await fetch(window.location.origin + '/request?code=' + code + '&uri=' + uri);
    session = await middle.json();

    if (session.error)
    {
        console.log(session.error);
    }
    else
    {
        sessionStorage.setItem('token', session.token);
        sessionStorage.setItem('refresh', session.refresh);
        location.href = window.location.origin + '/home';
    }
}