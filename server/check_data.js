const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companyCount = await prisma.company.count();
    const productCount = await prisma.product.count();

    console.log(`Companies: ${companyCount}`);
    console.log(`Products: ${productCount}`);

    if (companyCount === 0) {
        // Seed one company
        await prisma.company.create({
            data: {
                name: 'Demo Client Corp',
                email: 'contact@demo.com',
                phone: '123-456-7890',
                // categoryId might be needed if foreign key is strict, but it's nullable in schema
            }
        });
        console.log('Seeded Demo Company');
    }

    if (productCount === 0) {
        // Seed one product
        await prisma.product.create({
            data: {
                sku: 'WIDGET-001',
                name: 'Demo Widget',
                price: 25.50,
                quantity: 100,
                reserved: 0
            }
        });
        console.log('Seeded Demo Product');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
