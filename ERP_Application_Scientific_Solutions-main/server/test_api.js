const fetch = require('node-fetch');

async function testCategories() {
    try {
        // 1. Login to get token
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Got Token');

        // 2. Get Categories
        const getRes = await fetch('http://localhost:5000/api/categories', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const categories = await getRes.json();
        console.log('Categories:', categories);

    } catch (err) {
        console.error(err);
    }
}

testCategories();
