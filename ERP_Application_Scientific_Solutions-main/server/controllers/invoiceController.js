const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendInvoiceEmail, sendPaymentReminder } = require('../services/emailService');

// Helper: format items from request body, applying per-line discount + per-line VAT
const formatItems = (items) => {
    let subtotal = 0;
    const formatted = items.map(item => {
        const gross      = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
        const disc       = Math.min(100, Math.max(0, parseFloat(item.discountPercent) || 0));
        const vatPct     = Math.min(100, Math.max(0, parseFloat(item.vatPercent) || 0));
        const netLine    = gross * (1 - disc / 100);
        const lineTotal  = netLine * (1 + vatPct / 100);
        subtotal += lineTotal;
        return {
            productId:       item.productId ? parseInt(item.productId) : null,
            description:     item.description,
            quantity:        parseInt(item.quantity) || 0,
            unitPrice:       parseFloat(item.unitPrice) || 0,
            discountPercent: disc,
            vatPercent:      vatPct,
            totalPrice:      lineTotal,
        };
    });
    return { formatted, subtotal };
};

const createInvoice = async (req, res) => {
    try {
        const {
            companyId, items, dueDate, offerId, notes,
            poNumber, poDate, paymentMethod, paymentDate,
            discountPercent: headerDisc, discountAmount: headerDiscAmt,
        } = req.body;

        const company = await prisma.company.findUnique({
            where: { id: parseInt(companyId) },
            select: { vatPercentage: true, paymentTerms: true, incoterms: true }
        });

        const { formatted: formattedItems, subtotal } = formatItems(items || []);

        const headerDiscPct = Math.max(0, parseFloat(headerDisc) || 0);
        const headerDiscountAmt = headerDiscAmt
            ? parseFloat(headerDiscAmt)
            : subtotal * (headerDiscPct / 100);
        const discountedSubtotal = subtotal - headerDiscountAmt;

        const taxRate = req.body.taxRate != null
            ? parseFloat(req.body.taxRate)
            : (company?.vatPercentage ? parseFloat(String(company.vatPercentage)) : 0);
        const finalTotal = discountedSubtotal * (1 + taxRate / 100);

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.invoice.count();
        const invoiceNumber = `INV-${dateStr}-${count + 1}`;

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                companyId:       parseInt(companyId),
                totalAmount:     finalTotal,
                taxRate,
                discountPercent: headerDiscPct,
                discountAmount:  headerDiscountAmt,
                dueDate:         dueDate ? new Date(dueDate) : null,
                offerId:         offerId ? parseInt(offerId) : null,
                projectId:       req.body.projectId ? parseInt(req.body.projectId) : null,
                status:          req.body.status || 'UNPAID',
                notes:           notes || null,
                poNumber:        poNumber || null,
                poDate:          poDate ? new Date(poDate) : null,
                paymentMethod:   paymentMethod || null,
                paymentDate:     paymentDate ? new Date(paymentDate) : null,
                items:           { create: formattedItems }
            },
            include: { items: true, company: true }
        });

        res.json({
            ...invoice,
            _companyMeta: {
                paymentTerms: company?.paymentTerms || null,
                incoterms:    company?.incoterms    || null,
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const getInvoices = async (req, res) => {
    try {
        const { status, companyId, overdue } = req.query;
        const where = {};
        if (status)    where.status    = status;
        if (companyId) where.companyId = parseInt(companyId);
        if (overdue === 'true') {
            where.dueDate = { lt: new Date() };
            where.status  = { not: 'PAID' };
        }
        const invoices = await prisma.invoice.findMany({
            where,
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
                items:   { include: { product: true } }
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
        const { status } = req.body;
        const invoice = await prisma.invoice.update({
            where: { id: parseInt(id) },
            data:  { status }
        });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, paymentDate } = req.body;
        if (!paymentMethod) return res.status(400).json({ error: 'paymentMethod is required' });
        const invoice = await prisma.invoice.update({
            where: { id: parseInt(id) },
            data: {
                paymentMethod,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                status: 'PAID',
            }
        });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createFromOffer = async (req, res) => {
    try {
        const { offerId } = req.body;
        const offer = await prisma.offer.findUnique({
            where: { id: parseInt(offerId) },
            include: { items: true }
        });
        if (!offer) return res.status(404).json({ error: 'Offer not found' });

        const existing = await prisma.invoice.findUnique({ where: { offerId: parseInt(offerId) } });
        if (existing) return res.status(400).json({ error: 'Invoice already exists for this offer' });

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count   = await prisma.invoice.count();
        const invoiceNumber = `INV-${dateStr}-${count + 1}`;

        const invoiceItems = offer.items.map(item => ({
            productId:       item.productId,
            description:     item.description,
            quantity:        item.quantity,
            unitPrice:       item.unitPrice,
            discountPercent: item.discountPercent ?? 0,
            totalPrice:      item.totalPrice,
        }));

        const invoice = await prisma.$transaction(async (tx) => {
            const inv = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    companyId:   offer.companyId,
                    totalAmount: offer.totalAmount,
                    taxRate:     offer.taxRate || 0,
                    offerId:     offer.id,
                    status:      'UNPAID',
                    dueDate:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    items:       { create: invoiceItems }
                }
            });
            // Mark offer as CONVERTED
            await tx.offer.update({
                where: { id: offer.id },
                data:  { status: 'CONVERTED' }
            });
            return inv;
        });

        res.json(invoice);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            companyId, items, dueDate, taxRate, status, notes,
            poNumber, poDate, paymentMethod, paymentDate,
            discountPercent: headerDisc, discountAmount: headerDiscAmt,
        } = req.body;
        const invoiceId = parseInt(id);

        const result = await prisma.$transaction(async (tx) => {
            await tx.invoiceItem.deleteMany({ where: { invoiceId } });

            const { formatted: formattedItems, subtotal } = formatItems(items || []);

            const headerDiscPct = Math.max(0, parseFloat(headerDisc) || 0);
            const headerDiscountAmt = headerDiscAmt
                ? parseFloat(headerDiscAmt)
                : subtotal * (headerDiscPct / 100);
            const discountedSubtotal = subtotal - headerDiscountAmt;

            const rate       = taxRate ? parseFloat(taxRate) : 0;
            const finalTotal = discountedSubtotal * (1 + rate / 100);

            return await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    companyId:       companyId ? parseInt(companyId) : undefined,
                    totalAmount:     finalTotal,
                    taxRate:         rate,
                    discountPercent: headerDiscPct,
                    discountAmount:  headerDiscountAmt,
                    dueDate:         dueDate ? new Date(dueDate) : null,
                    status:          status || undefined,
                    notes:           notes !== undefined ? notes : undefined,
                    poNumber:        poNumber !== undefined ? poNumber : undefined,
                    poDate:          poDate ? new Date(poDate) : undefined,
                    paymentMethod:   paymentMethod !== undefined ? paymentMethod : undefined,
                    paymentDate:     paymentDate ? new Date(paymentDate) : undefined,
                    projectId:       req.body.projectId !== undefined ? (req.body.projectId ? parseInt(req.body.projectId) : null) : undefined,
                    items:           { create: formattedItems }
                },
                include: { items: true, company: true }
            });
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceId = parseInt(id);
        await prisma.$transaction(async (tx) => {
            await tx.invoiceItem.deleteMany({ where: { invoiceId } });
            await tx.invoice.delete({ where: { id: invoiceId } });
        });
        res.json({ message: 'Invoice deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const getRevenueReport = async (req, res) => {
    try {
        const { groupBy = 'month' } = req.query;

        const invoices = await prisma.invoice.findMany({
            where:   { status: { in: ['PAID', 'UNPAID', 'OVERDUE'] } },
            include: { company: { select: { id: true, name: true } } },
            orderBy: { date: 'asc' }
        });

        const byPeriod = {};
        const byClient = {};
        let totalRevenue = 0;
        let outstanding  = 0;

        for (const inv of invoices) {
            const d      = new Date(inv.date);
            const key    = groupBy === 'year'
                ? `${d.getFullYear()}`
                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const amt    = parseFloat(inv.totalAmount);
            const isPaid = inv.status === 'PAID';

            if (!byPeriod[key]) byPeriod[key] = { period: key, revenue: 0, count: 0 };
            byPeriod[key].count++;
            if (isPaid) byPeriod[key].revenue += amt;

            const companyId  = inv.company?.id   || 0;
            const clientName = inv.company?.name || 'Unknown';
            if (!byClient[companyId]) byClient[companyId] = { companyId, clientName, revenue: 0, outstanding: 0, count: 0 };
            byClient[companyId].count++;
            if (isPaid) byClient[companyId].revenue    += amt;
            else        byClient[companyId].outstanding += amt;

            if (isPaid) totalRevenue += amt;
            else        outstanding  += amt;
        }

        res.json({
            totalRevenue,
            outstanding,
            byPeriod: Object.values(byPeriod),
            byClient: Object.values(byClient).sort((a, b) => b.revenue - a.revenue),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const sendInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientEmail } = req.body;
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(id) },
            include: { items: true, company: { select: { name: true, email: true } } },
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const to = recipientEmail || invoice.company?.email;
        if (!to) return res.status(400).json({ error: 'No recipient email address available. Please provide one or add email to the company.' });

        const settings = await prisma.settings.findFirst({ where: { isDefault: true } });
        await sendInvoiceEmail({ to, invoice, settings });

        // Mark as SENT (if still DRAFT → UNPAID)
        if (invoice.status === 'DRAFT') {
            await prisma.invoice.update({ where: { id: parseInt(id) }, data: { status: 'UNPAID' } });
        }
        res.json({ message: `Invoice sent to ${to}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send email. Check SMTP configuration in server .env file.' });
    }
};

const sendReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientEmail } = req.body;
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(id) },
            include: { items: true, company: { select: { name: true, email: true } } },
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Cannot send reminder for paid or cancelled invoice' });
        }

        const to = recipientEmail || invoice.company?.email;
        if (!to) return res.status(400).json({ error: 'No recipient email address available.' });

        const settings = await prisma.settings.findFirst({ where: { isDefault: true } });
        await sendPaymentReminder({ to, invoice, settings });
        res.json({ message: `Payment reminder sent to ${to}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send reminder. Check SMTP configuration.' });
    }
};

module.exports = {
    createInvoice, getInvoices, getInvoice,
    updateStatus, recordPayment, sendInvoice, sendReminder,
    createFromOffer, updateInvoice, deleteInvoice,
    getRevenueReport,
};
