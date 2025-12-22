const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const lastOffer = await prisma.offer.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        console.log('Last Offer:', JSON.stringify(lastOffer, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
