const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counter = await prisma.plmCounter.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            lastNumber: 0
        },
    });

    console.log('PLM Counter initialized:', counter);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
