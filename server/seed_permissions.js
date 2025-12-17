const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultPermissions = [
    // Offer permissions
    { name: 'MANAGE_OFFER_TEMPLATES', description: 'Create and edit offer templates', category: 'OFFERS' },
    { name: 'CREATE_OFFERS', description: 'Generate new offers from templates', category: 'OFFERS' },
    { name: 'VIEW_OFFER_HISTORY', description: 'View past offers and search/filter', category: 'OFFERS' },
    { name: 'EDIT_OFFERS', description: 'Edit existing offers', category: 'OFFERS' },
    { name: 'DELETE_OFFERS', description: 'Delete offers', category: 'OFFERS' },

    // Invoice permissions
    { name: 'MANAGE_INVOICES', description: 'Create, edit, and delete invoices', category: 'INVOICES' },
    { name: 'VIEW_INVOICES', description: 'View invoices', category: 'INVOICES' },
    { name: 'GENERATE_INVOICE_PDF', description: 'Generate and download invoice PDFs', category: 'INVOICES' },

    // Settings permissions
    { name: 'MANAGE_GENERAL_SETTINGS', description: 'Manage date & time format settings', category: 'SETTINGS' },
    { name: 'MANAGE_EMAIL_TEMPLATES', description: 'Manage email template settings', category: 'SETTINGS' },

    // Admin permissions
    { name: 'MANAGE_SUB_ADMINS', description: 'Create, edit, and delete sub-admin users', category: 'ADMIN' },

    // Company & Contact permissions
    { name: 'MANAGE_COMPANIES', description: 'Create, edit, and delete companies', category: 'CONTACTS' },
    { name: 'MANAGE_CONTACTS', description: 'Create, edit, and delete contacts', category: 'CONTACTS' },

    // Inventory permissions
    { name: 'MANAGE_INVENTORY', description: 'Manage products and stock', category: 'INVENTORY' },
    { name: 'VIEW_INVENTORY', description: 'View inventory', category: 'INVENTORY' },

    // Project permissions
    { name: 'MANAGE_PROJECTS', description: 'Create, edit, and delete projects', category: 'PROJECTS' },
    { name: 'VIEW_PROJECTS', description: 'View projects', category: 'PROJECTS' },
];

async function seedPermissions() {
    try {
        console.log('Seeding default permissions...');

        for (const permission of defaultPermissions) {
            await prisma.permission.upsert({
                where: { name: permission.name },
                update: {},
                create: permission,
            });
        }

        console.log(`✓ Seeded ${defaultPermissions.length} permissions`);

        // Grant all permissions to existing ADMIN users
        const adminUsers = await prisma.user.findMany({
            where: { role: 'ADMIN' }
        });

        const allPermissions = await prisma.permission.findMany();

        for (const admin of adminUsers) {
            console.log(`Granting all permissions to ADMIN user: ${admin.email}`);

            for (const permission of allPermissions) {
                await prisma.userPermission.upsert({
                    where: {
                        userId_permissionId: {
                            userId: admin.id,
                            permissionId: permission.id
                        }
                    },
                    update: {},
                    create: {
                        userId: admin.id,
                        permissionId: permission.id
                    }
                });
            }
        }

        console.log('✓ Permissions seeded successfully!');

    } catch (error) {
        console.error('Error seeding permissions:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedPermissions();
