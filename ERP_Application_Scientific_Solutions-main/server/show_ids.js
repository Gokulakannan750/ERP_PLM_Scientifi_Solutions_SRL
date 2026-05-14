const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Contact Categories (Master) ---');
    const categories = await prisma.contactCategory.findMany();
    console.table(categories.map(c => ({ id: c.id, name: c.name })));

    console.log('\n--- Contacts (Customers/Suppliers) ---');
    const contacts = await prisma.contact.findMany();
    console.table(contacts.map(c => ({ id: c.id, name: c.name, company: c.company })));

    console.log('\n--- Inventory (Products) ---');
    const products = await prisma.product.findMany();
    console.table(products.map(p => ({ id: p.id, name: p.name, sku: p.sku, qty: p.quantity })));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
