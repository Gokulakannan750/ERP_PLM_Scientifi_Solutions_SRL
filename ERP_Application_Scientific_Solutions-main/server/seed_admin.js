const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'admin@erp.com' },
        update: {},
        create: {
            email: 'admin@erp.com',
            password: hashedPassword,
            role: 'ADMIN' // or SUB_ADMIN if that's the enum default, but string is better
        },
    });

    console.log('Admin user created:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
