const sql = require('mssql');

const config = {
    user: 'erp_user',
    password: 'Password123!',
    server: 'localhost',
    database: 'master',
    options: {
        instanceName: 'MSSQLLocalDB',
        encrypt: true,
        trustServerCertificate: true
    }
};

async function testConnection() {
    try {
        await sql.connect(config);
        console.log('Connected successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
