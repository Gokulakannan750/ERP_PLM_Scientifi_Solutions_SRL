const prisma = require('./prismaClient');
const bcrypt = require('bcryptjs');
const logger = require('./utils/logger');

async function seed() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // 1. Create Admin User (if not exists)
        const adminEmail = 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) { console.error('Error: ADMIN_PASSWORD env var required'); process.exit(1); }

        let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!admin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            admin = await prisma.user.create({
                data: {
                    email: adminEmail,
                    password: hashedPassword,
                    name: 'Admin User',
                    role: 'ADMIN'
                }
            });
            console.log('✓ Created admin user:', admin.email);
        } else {
            console.log('✓ Admin user already exists');
        }

        // 2. Create Sub-Admin User
        const subAdminEmail = 'user@example.com';
        const userPassword = process.env.DEFAULT_USER_PASSWORD;
        if (!userPassword) { console.error('Error: DEFAULT_USER_PASSWORD env var required'); process.exit(1); }

        let subAdmin = await prisma.user.findUnique({ where: { email: subAdminEmail } });
        if (!subAdmin) {
            const hashedPassword = await bcrypt.hash(userPassword, 10);
            subAdmin = await prisma.user.create({
                data: {
                    email: subAdminEmail,
                    password: hashedPassword,
                    name: 'Regular User',
                    role: 'SUB_ADMIN'
                }
            });
            console.log('✓ Created sub-admin user:', subAdmin.email);
        }

        // 3. Create Contact Categories
        const categories = [
            { name: 'Supplier', description: 'Product and material suppliers' },
            { name: 'Client', description: 'Customers and clients' },
            { name: 'Partner', description: 'Business partners' },
            { name: 'Contractor', description: 'Service contractors' }
        ];

        const createdCategories = [];
        for (const cat of categories) {
            const existing = await prisma.contactCategory.findUnique({ where: { name: cat.name } });
            if (!existing) {
                const created = await prisma.contactCategory.create({ data: cat });
                createdCategories.push(created);
                console.log(`✓ Created category: ${created.name}`);
            } else {
                createdCategories.push(existing);
            }
        }

        // 4. Create Companies
        const companiesData = [
            {
                name: 'ABC Suppliers Ltd',
                website: 'https://abcsuppliers.com',
                email: 'contact@abcsuppliers.com',
                phone: '+1-555-0101',
                categoryId: createdCategories.find(c => c.name === 'Supplier')?.id
            },
            {
                name: 'Tech Solutions Inc',
                website: 'https://techsolutions.com',
                email: 'info@techsolutions.com',
                phone: '+1-555-0102',
                categoryId: createdCategories.find(c => c.name === 'Client')?.id
            },
            {
                name: 'Global Materials Corp',
                website: 'https://globalmaterials.com',
                email: 'sales@globalmaterials.com',
                phone: '+1-555-0103',
                categoryId: createdCategories.find(c => c.name === 'Supplier')?.id
            },
            {
                name: 'Innovation Labs',
                website: 'https://innovationlabs.com',
                email: 'contact@innovationlabs.com',
                phone: '+1-555-0104',
                categoryId: createdCategories.find(c => c.name === 'Client')?.id
            }
        ];

        const companies = [];
        for (const companyData of companiesData) {
            const existing = await prisma.company.findFirst({ where: { name: companyData.name } });
            if (!existing) {
                const company = await prisma.company.create({ data: companyData });
                companies.push(company);
                console.log(`✓ Created company: ${company.name}`);
            } else {
                companies.push(existing);
            }
        }

        // 5. Create Addresses for Companies
        for (const company of companies) {
            const existingAddress = await prisma.address.findFirst({ where: { companyId: company.id } });
            if (!existingAddress) {
                await prisma.address.create({
                    data: {
                        companyId: company.id,
                        street: `${Math.floor(Math.random() * 9000) + 1000} Main Street`,
                        city: ['New York', 'Los Angeles', 'Chicago', 'Houston'][Math.floor(Math.random() * 4)],
                        state: ['NY', 'CA', 'IL', 'TX'][Math.floor(Math.random() * 4)],
                        pincode: `${Math.floor(Math.random() * 90000) + 10000}`,
                        country: 'USA'
                    }
                });
            }
        }
        console.log('✓ Created addresses for companies');

        // 6. Create Contacts/People
        const contactsData = [
            { name: 'John Smith', email: 'john.smith@abcsuppliers.com', phone: '+1-555-1001', jobTitle: 'Sales Manager', companyId: companies[0]?.id },
            { name: 'Sarah Johnson', email: 'sarah.j@techsolutions.com', phone: '+1-555-1002', jobTitle: 'CEO', companyId: companies[1]?.id },
            { name: 'Michael Brown', email: 'm.brown@globalmaterials.com', phone: '+1-555-1003', jobTitle: 'Procurement Head', companyId: companies[2]?.id },
            { name: 'Emily Davis', email: 'emily@innovationlabs.com', phone: '+1-555-1004', jobTitle: 'CTO', companyId: companies[3]?.id }
        ];

        for (const contactData of contactsData) {
            const existing = await prisma.contact.findFirst({ where: { email: contactData.email } });
            if (!existing && contactData.companyId) {
                await prisma.contact.create({ data: contactData });
                console.log(`✓ Created contact: ${contactData.name}`);
            }
        }

        // 7. Create Products
        const productsData = [
            { sku: 'PROD-001', name: 'Precision Sensor X100', description: 'High-precision temperature sensor', price: 299.99, quantity: 50, minLevel: 10, maxLevel: 100, supplierId: companies[0]?.id },
            { sku: 'PROD-002', name: 'Control Board Pro', description: 'Advanced microcontroller board', price: 149.50, quantity: 75, minLevel: 15, maxLevel: 150, supplierId: companies[0]?.id },
            { sku: 'PROD-003', name: 'LED Display Module', description: '7-segment LED display', price: 89.99, quantity: 120, minLevel: 20, maxLevel: 200, supplierId: companies[2]?.id },
            { sku: 'PROD-004', name: 'Power Supply Unit 24V', description: '24V 10A power supply', price: 199.00, quantity: 40, minLevel: 8, maxLevel: 80, supplierId: companies[2]?.id },
            { sku: 'PROD-005', name: 'Cable Assembly Kit', description: 'Complete wiring kit', price: 45.75, quantity: 200, minLevel: 30, maxLevel: 300, supplierId: companies[0]?.id }
        ];

        for (const prodData of productsData) {
            const existing = await prisma.product.findFirst({ where: { sku: prodData.sku, isLatest: true } });
            if (!existing) {
                await prisma.product.create({
                    data: {
                        ...prodData,
                        modifiedByUserId: admin.id,
                        isLatest: true
                    }
                });
                console.log(`✓ Created product: ${prodData.name}`);
            }
        }

        // 8. Create Projects
        const projectsData = [
            { name: 'Smart Building System', description: 'IoT-based building automation', budget: 50000, status: 'active', clientId: companies[1]?.id, startDate: new Date('2024-01-15'), endDate: new Date('2024-12-31') },
            { name: 'Industrial Monitoring Platform', description: 'Real-time factory monitoring', budget: 75000, status: 'active', clientId: companies[3]?.id, startDate: new Date('2024-03-01'), endDate: new Date('2025-02-28') }
        ];

        for (const proj of projectsData) {
            const existing = await prisma.project.findFirst({ where: { name: proj.name } });
            if (!existing && proj.clientId) {
                await prisma.project.create({ data: proj });
                console.log(`✓ Created project: ${proj.name}`);
            }
        }

        // 9. Create Offers
        const products = await prisma.product.findMany({ where: { isLatest: true }, take: 3 });
        if (products.length >= 2 && companies[1]) {
            const existingOffer = await prisma.offer.findFirst({ where: { companyId: companies[1].id } });
            if (!existingOffer) {
                await prisma.offer.create({
                    data: {
                        offerNumber: `OFF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
                        companyId: companies[1].id,
                        totalAmount: products[0].price * 10 + products[1].price * 5,
                        status: 'SENT',
                        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        items: {
                            create: [
                                { productId: products[0].id, description: products[0].name, quantity: 10, unitPrice: products[0].price, totalPrice: products[0].price * 10 },
                                { productId: products[1].id, description: products[1].name, quantity: 5, unitPrice: products[1].price, totalPrice: products[1].price * 5 }
                            ]
                        }
                    }
                });
                console.log('✓ Created sample offer');
            }
        }

        // 10. Create Invoice
        if (products.length >= 2 && companies[3]) {
            const existingInvoice = await prisma.invoice.findFirst({ where: { companyId: companies[3].id } });
            if (!existingInvoice) {
                await prisma.invoice.create({
                    data: {
                        invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
                        companyId: companies[3].id,
                        totalAmount: products[0].price * 15 + products[2]?.price * 8 || 0,
                        status: 'UNPAID',
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        items: {
                            create: [
                                { productId: products[0].id, description: products[0].name, quantity: 15, unitPrice: products[0].price, totalPrice: products[0].price * 15 },
                                { productId: products[2]?.id, description: products[2]?.name || 'Product', quantity: 8, unitPrice: products[2]?.price || 0, totalPrice: (products[2]?.price || 0) * 8 }
                            ]
                        }
                    }
                });
                console.log('✓ Created sample invoice');
            }
        }

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\nLogin credentials:');
        console.log('Admin: admin@example.com / admin123');
        console.log('User: user@example.com / user123');

    } catch (error) {
        console.error('❌ Seeding error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seed();
