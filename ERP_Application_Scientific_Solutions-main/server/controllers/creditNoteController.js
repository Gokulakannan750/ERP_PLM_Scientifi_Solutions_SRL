const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCreditNotes = async (req, res) => {
    try {
        const creditNotes = await prisma.creditNote.findMany({
            include: {
                invoice: { select: { id: true, invoiceNumber: true } },
                company: { select: { id: true, name: true } },
                items:   true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(creditNotes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getCreditNote = async (req, res) => {
    try {
        const { id } = req.params;
        const cn = await prisma.creditNote.findUnique({
            where: { id: parseInt(id) },
            include: {
                invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
                company: { select: { id: true, name: true, email: true } },
                items:   true,
            },
        });
        if (!cn) return res.status(404).json({ error: 'Credit note not found' });
        res.json(cn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createCreditNote = async (req, res) => {
    try {
        const { invoiceId, reason, items } = req.body;

        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(invoiceId) },
            select: { id: true, companyId: true, invoiceNumber: true },
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // Generate credit note number
        const count = await prisma.creditNote.count();
        const creditNoteNumber = `CN-${String(count + 1).padStart(5, '0')}`;

        const formattedItems = (items || []).map(item => ({
            description: item.description,
            quantity:    parseInt(item.quantity) || 1,
            unitPrice:   parseFloat(item.unitPrice) || 0,
            totalPrice:  (parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
            productId:   item.productId ? parseInt(item.productId) : null,
        }));

        const totalAmount = formattedItems.reduce((s, i) => s + i.totalPrice, 0);

        const cn = await prisma.creditNote.create({
            data: {
                creditNoteNumber,
                invoiceId:   invoice.id,
                companyId:   invoice.companyId,
                reason:      reason || null,
                totalAmount,
                items:       { create: formattedItems },
            },
            include: {
                invoice: { select: { id: true, invoiceNumber: true } },
                company: { select: { id: true, name: true } },
                items:   true,
            },
        });
        res.status(201).json(cn);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const issueCreditNote = async (req, res) => {
    try {
        const { id } = req.params;
        const cn = await prisma.creditNote.update({
            where: { id: parseInt(id) },
            data:  { status: 'ISSUED', issuedAt: new Date() },
        });
        res.json(cn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const applyCreditNote = async (req, res) => {
    try {
        const { id } = req.params;
        const cn = await prisma.creditNote.findUnique({
            where: { id: parseInt(id) },
            include: { invoice: true },
        });
        if (!cn) return res.status(404).json({ error: 'Credit note not found' });
        if (cn.status !== 'ISSUED') return res.status(400).json({ error: 'Only ISSUED credit notes can be applied' });

        await prisma.$transaction([
            prisma.creditNote.update({ where: { id: cn.id }, data: { status: 'APPLIED' } }),
            // Reduce original invoice total by credit note amount (floor at 0)
            prisma.invoice.update({
                where: { id: cn.invoiceId },
                data: {
                    totalAmount: Math.max(0, parseFloat(cn.invoice.totalAmount.toString()) - parseFloat(cn.totalAmount.toString())),
                },
            }),
        ]);
        res.json({ message: 'Credit note applied to original invoice' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteCreditNote = async (req, res) => {
    try {
        const { id } = req.params;
        const cn = await prisma.creditNote.findUnique({ where: { id: parseInt(id) } });
        if (!cn) return res.status(404).json({ error: 'Not found' });
        if (cn.status !== 'DRAFT') return res.status(400).json({ error: 'Only DRAFT credit notes can be deleted' });
        await prisma.creditNoteItem.deleteMany({ where: { creditNoteId: cn.id } });
        await prisma.creditNote.delete({ where: { id: cn.id } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getCreditNotes, getCreditNote, createCreditNote, issueCreditNote, applyCreditNote, deleteCreditNote };
