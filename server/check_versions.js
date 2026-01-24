const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVersions() {
    console.log('Checking product versions...\n');

    // Get products with IDs 9, 11, 12
    const products = await prisma.product.findMany({
        where: {
            id: { in: [9, 11, 12] }
        },
        select: {
            id: true,
            name: true,
            price: true,
            isLatest: true,
            lastRecID: true,
            recDate: true
        },
        orderBy: { id: 'asc' }
    });

    console.log('Products found:');
    products.forEach(p => {
        console.log(`ID: ${p.id}, Name: ${p.name}, Price: ${p.price}, isLatest: ${p.isLatest}, lastRecID: ${p.lastRecID}`);
    });

    console.log('\n--- Calculating versions ---\n');

    // Get all latest products and calculate versions
    const latestProducts = await prisma.product.findMany({
        where: { isLatest: true },
        select: {
            id: true,
            name: true,
            lastRecID: true
        }
    });

    for (const product of latestProducts) {
        let versionCount = 1;
        let currentId = product.lastRecID;

        console.log(`Product ID ${product.id} (${product.name}):`);
        console.log(`  lastRecID: ${product.lastRecID}`);

        while (currentId) {
            versionCount++;
            const prev = await prisma.product.findUnique({
                where: { id: currentId },
                select: { lastRecID: true, id: true }
            });
            console.log(`  -> Found previous version ID: ${prev?.id}, its lastRecID: ${prev?.lastRecID}`);
            currentId = prev?.lastRecID || null;
        }

        console.log(`  Final version count: v${versionCount}\n`);
    }

    await prisma.$disconnect();
}

checkVersions().catch(console.error);
