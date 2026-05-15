const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        console.error('Error: ADMIN_PASSWORD environment variable is required');
        process.exit(1);
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email: process.env.ADMIN_EMAIL || 'admin@erp.com' },
        update: {},
        create: {
            email: process.env.ADMIN_EMAIL || 'admin@erp.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log('Admin user created:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
