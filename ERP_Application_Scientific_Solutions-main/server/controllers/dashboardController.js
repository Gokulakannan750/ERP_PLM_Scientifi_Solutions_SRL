const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getStats = async (req, res) => {
    try {
        // 1. Total Revenue (Sum of PAID invoices)
        const revenueResult = await prisma.invoice.aggregate({
            _sum: {
                totalAmount: true
            },
            where: {
                status: 'PAID'
            }
        });
        const totalRevenue = revenueResult._sum.totalAmount || 0;

        // 2. Active Projects
        const activeProjects = await prisma.project.count({
            where: {
                status: 'ACTIVE'
            }
        });

        // 3. Low Stock Items (quantity <= minLevel per product, latest versions only)
        const lowStockResult = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM "Product"
            WHERE "isLatest" = 1 AND "quantity" <= "minLevel"
        `;
        const lowStockItems = parseInt(lowStockResult[0]?.count ?? 0);

        // 4. Total Users
        const totalUsers = await prisma.user.count();

        // Calculate trends (Simplified logic for now, hardcoded trends or simplified comparison)
        // For a real MVP, we might just show the current numbers. 
        // Or we could compare with last month (omitted for MVP speed unless requested).

        res.json({
            revenue: {
                value: totalRevenue,
                change: '+0%', // Placeholder for future implementation
                changeType: 'increase'
            },
            projects: {
                value: activeProjects,
                change: '0',
                changeType: 'neutral'
            },
            lowStock: {
                value: lowStockItems,
                change: '0',
                changeType: 'neutral'
            },
            users: {
                value: totalUsers,
                change: '0',
                changeType: 'increase'
            }
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

const getActivity = async (req, res) => {
    try {
        // Fetch recent 5 from each category to interleave
        const recentInvoices = await prisma.invoice.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { company: true }
        });

        const recentOffers = await prisma.offer.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { company: true }
        });

        const recentProjects = await prisma.project.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { client: true } // Assuming relation is named 'client' based on schema
        });

        // Normalize and combine
        const activities = [
            ...recentInvoices.map(inv => ({
                id: `inv-${inv.id}`,
                type: 'INVOICE',
                action: 'created invoice',
                target: `#${inv.invoiceNumber}`,
                user: 'System', // Since we don't strictly track Creator ID on Invoice yet, we'll genericize or use related user if available later
                time: inv.createdAt,
                details: `for ${inv.company.name}`
            })),
            ...recentOffers.map(off => ({
                id: `off-${off.id}`,
                type: 'OFFER',
                action: 'created offer',
                target: `#${off.offerNumber}`,
                user: 'System',
                time: off.createdAt,
                details: `for ${off.company.name}`
            })),
            ...recentProjects.map(proj => ({
                id: `proj-${proj.id}`,
                type: 'PROJECT',
                action: 'started project',
                target: proj.name,
                user: 'System',
                time: proj.createdAt,
                details: `for ${proj.client?.name}`
            }))
        ];

        // Sort by time descending and take top 5
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const top5 = activities.slice(0, 5);

        res.json(top5);

    } catch (error) {
        console.error('Dashboard Activity Error:', error);
        res.status(500).json({ message: 'Error fetching recent activity' });
    }
};

module.exports = {
    getStats,
    getActivity
};
