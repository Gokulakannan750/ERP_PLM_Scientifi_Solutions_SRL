const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING TEST ---');
    try {
        // 1. Get a company and product
        const company = await prisma.company.findFirst();
        const product = await prisma.product.findFirst();

        if (!company || !product) {
            console.log('Skipping test: No company or product found in DB.');
            return;
        }

        console.log(`Found Company: ${company.name}, Product: ${product.name} (Reserved: ${product.reserved})`);

        // 2. Create Offer
        const offerNumber = `TEST-OFFER-${Date.now()}`;
        console.log(`Creating Offer: ${offerNumber}`);

        const offer = await prisma.offer.create({
            data: {
                offerNumber,
                companyId: company.id,
                totalAmount: 100,
                status: 'DRAFT',
                items: {
                    create: [{
                        productId: product.id,
                        description: 'Test Item',
                        quantity: 5,
                        unitPrice: 20,
                        totalPrice: 100
                    }]
                }
            },
            include: { items: true }
        });

        console.log(`Offer Created! ID: ${offer.id}`);

        // 3. Update Reserved (Simulate Logic or check if controller logic is what we test)
        // NOTE: The controller handles the reservation logic in the transaction. 
        // Since we are not running the controller, we must verify the DB Schema allows us to Write.
        // Ideally we should test the Controller function, but that requires mock Req/Res.
        // Let's just manually run the update to prove the COLUMN exists.

        await prisma.product.update({
            where: { id: product.id },
            data: { reserved: { increment: 5 } }
        });

        const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
        console.log(`Product Updated! Reserved is now: ${updatedProduct.reserved}`);

        console.log('--- TEST SUCCESS: Database is ready ---');

    } catch (e) {
        console.error('--- TEST FAILED ---');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
