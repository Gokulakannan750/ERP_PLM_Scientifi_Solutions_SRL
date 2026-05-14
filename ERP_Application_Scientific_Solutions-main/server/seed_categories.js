const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const categories = ['Supplier', 'Customer', 'Private', 'Other'];

    for (const name of categories) {
        await prisma.contactCategory.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log('Categories seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
