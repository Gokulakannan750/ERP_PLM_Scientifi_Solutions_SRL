const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createInvoice = async (req, res) => {
    try {
        const { companyId, items, dueDate, offerId } = req.body;

        let totalAmount = 0;
        const formattedItems = items.map(item => {
            const lineTotal = item.quantity * item.unitPrice;
            totalAmount += lineTotal;
            return {
                productId: item.productId ? parseInt(item.productId) : null,
                description: item.description,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                totalPrice: lineTotal
            };
        });

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.invoice.count();
        const invoiceNumber = `INV-${dateStr}-${count + 1}`;

        // Apply Tax
        const taxRate = req.body.taxRate ? parseFloat(req.body.taxRate) : 0;
        const taxAmount = totalAmount * (taxRate / 100);
        const finalTotal = totalAmount + taxAmount;

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                companyId: parseInt(companyId),
                totalAmount: finalTotal,
                taxRate: taxRate,
                dueDate: dueDate ? new Date(dueDate) : null,
                offerId: offerId ? parseInt(offerId) : null,
                status: 'UNPAID',
                items: {
                    create: formattedItems
                }
            },
            include: { items: true }
        });

        res.json(invoice);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const getInvoices = async (req, res) => {
    try {
        const invoices = await prisma.invoice.findMany({
            include: { company: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(id) },
            include: {
                company: { include: { addresses: true } },
                items: { include: { product: true } }
            }
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // UNPAID, PAID, OVERDUE
        const invoice = await prisma.invoice.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Convert Offer to Invoice logic could be handled on frontend by pre-filling createInvoice, 
// OR a dedicated endpoint. Dedicated endpoint is cleaner for "One Click" action.
const createFromOffer = async (req, res) => {
    try {
        const { offerId } = req.body;
        const offer = await prisma.offer.findUnique({
            where: { id: parseInt(offerId) },
            include: { items: true }
        });

        if (!offer) return res.status(404).json({ error: 'Offer not found' });

        // Check if invoice already exists for this offer
        const existing = await prisma.invoice.findUnique({
            where: { offerId: parseInt(offerId) }
        });
        if (existing) return res.status(400).json({ error: 'Invoice already exists for this offer' });

        // Generate Invoice Number
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.invoice.count();
        const invoiceNumber = `INV-${dateStr}-${count + 1}`;

        // Map Offer Items -> Invoice Items
        const invoiceItems = offer.items.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
        }));

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                companyId: offer.companyId,
                totalAmount: offer.totalAmount, // Already includes tax
                taxRate: offer.taxRate || 0,
                offerId: offer.id,
                status: 'UNPAID', // Default
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                items: {
                    create: invoiceItems
                }
            }
        });

        res.json(invoice);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createInvoice, getInvoices, getInvoice, updateStatus, createFromOffer };
