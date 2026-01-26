// const fetch = require('node-fetch');

async function testAuth() {
    const BASE_URL = 'http://localhost:3000/api/portal/auth';

    console.log('1. Testing Registration...');
    try {
        const regRes = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser_' + Date.now(),
                password: 'password123',
                division: 'IT'
            })
        });
        const regData = await regRes.json();
        console.log('Registration Status:', regRes.status);
        console.log('Registration Response:', regData);

        if (regRes.ok) {
            console.log('2. Testing Login...');
            const loginRes = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: regData.username || ('testuser_' + Date.now()), // logic fix needed if username not returned
                    password: 'password123'
                })
            });
            // Actually I don't have username from regData usually, let's store it
            // Oh wait, my reg script used dynamic username.
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

// Better script
(async () => {
    const username = 'testuser_' + Math.floor(Math.random() * 1000);
    const password = 'password123';

    console.log(`Testing with ${username}...`);

    try {
        // Register
        const reg = await fetch('http://localhost:3000/api/portal/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, division: 'IT' })
        });
        console.log('Register:', await reg.status, await reg.json());

        // Login
        const login = await fetch('http://localhost:3000/api/portal/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const loginData = await login.json();
        console.log('Login:', login.status, loginData.token ? 'Token Received' : 'No Token');

    } catch (err) {
        console.error(err);
    }
})();
