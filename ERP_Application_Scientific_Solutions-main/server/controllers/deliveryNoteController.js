const { PrismaClient } = require('@prisma/client');
const fs   = require('fs');
const prisma = new PrismaClient();

const generateDNNumber = async () => {
    const year = new Date().getFullYear();
    const last = await prisma.deliveryNote.findFirst({
        where: { deliveryNumber: { startsWith: `DN-${year}-` } },
        orderBy: { deliveryNumber: 'desc' },
    });
    const seq = last ? parseInt(last.deliveryNumber.split('-').pop()) + 1 : 1;
    return `DN-${year}-${String(seq).padStart(4, '0')}`;
};

const getDeliveryNotes = async (req, res) => {
    try {
        const { status, companyId, projectId } = req.query;
        const where = {};
        if (status)    where.status    = status;
        if (companyId) where.companyId = parseInt(companyId);
        if (projectId) where.projectId = parseInt(projectId);

        const notes = await prisma.deliveryNote.findMany({
            where,
            include: {
                company: { select: { id: true, name: true } },
                invoice: { select: { id: true, invoiceNumber: true } },
                project: { select: { id: true, name: true } },
                items:   true,
                documents: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getDeliveryNote = async (req, res) => {
    try {
        const { id } = req.params;
        const dn = await prisma.deliveryNote.findUnique({
            where: { id: parseInt(id) },
            include: {
                company: { select: { id: true, name: true, email: true } },
                invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
                project: { select: { id: true, name: true } },
                items:   true,
                documents: true,
            },
        });
        if (!dn) return res.status(404).json({ error: 'Delivery note not found' });
        res.json(dn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createDeliveryNote = async (req, res) => {
    try {
        const {
            companyId, invoiceId, projectId, deliveryDate, customerPoNumber,
            customerPoDate, carrier, trackingNumber, incoterms, packageType,
            packageCount, weightKg, dimensionL, dimensionW, dimensionH,
            deliveryAddress, notes, items,
        } = req.body;

        if (!companyId) return res.status(400).json({ error: 'companyId is required' });

        const deliveryNumber = await generateDNNumber();
        const dn = await prisma.deliveryNote.create({
            data: {
                deliveryNumber,
                companyId:       parseInt(companyId),
                invoiceId:       invoiceId ? parseInt(invoiceId) : null,
                projectId:       projectId ? parseInt(projectId) : null,
                deliveryDate:    deliveryDate ? new Date(deliveryDate) : null,
                customerPoNumber: customerPoNumber || null,
                customerPoDate:  customerPoDate ? new Date(customerPoDate) : null,
                carrier:         carrier || null,
                trackingNumber:  trackingNumber || null,
                incoterms:       incoterms || null,
                packageType:     packageType || null,
                packageCount:    packageCount ? parseInt(packageCount) : null,
                weightKg:        weightKg ? parseFloat(weightKg) : null,
                dimensionL:      dimensionL ? parseFloat(dimensionL) : null,
                dimensionW:      dimensionW ? parseFloat(dimensionW) : null,
                dimensionH:      dimensionH ? parseFloat(dimensionH) : null,
                deliveryAddress: deliveryAddress || null,
                notes:           notes || null,
                status:          'DRAFT',
                items: {
                    create: (items || []).map(item => ({
                        productId:   item.productId ? parseInt(item.productId) : null,
                        description: item.description || '',
                        quantity:    parseFloat(item.quantity) || 0,
                        unitOfMeasure: item.unitOfMeasure || 'units',
                        serialNumbers: item.serialNumbers || null,
                        batchNumber:   item.batchNumber || null,
                        notes:         item.notes || null,
                    })),
                },
            },
            include: {
                company: { select: { id: true, name: true } },
                items:   true,
            },
        });
        res.status(201).json(dn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Auto-generate delivery note from an invoice's line items
const generateFromInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(invoiceId) },
            include: {
                items:   true,
                company: { select: { id: true, name: true } },
            },
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const deliveryNumber = await generateDNNumber();
        const dn = await prisma.deliveryNote.create({
            data: {
                deliveryNumber,
                companyId: invoice.companyId,
                invoiceId: invoice.id,
                status:    'DRAFT',
                items: {
                    create: invoice.items.map(item => ({
                        description:  item.description,
                        quantity:     parseFloat(item.quantity),
                        unitOfMeasure: 'units',
                    })),
                },
            },
            include: {
                company: { select: { id: true, name: true } },
                items:   true,
            },
        });
        res.status(201).json(dn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateDeliveryNote = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            companyId, invoiceId, projectId, deliveryDate, customerPoNumber,
            customerPoDate, carrier, trackingNumber, incoterms, packageType,
            packageCount, weightKg, dimensionL, dimensionW, dimensionH,
            deliveryAddress, notes, items,
        } = req.body;

        const existing = await prisma.deliveryNote.findUnique({ where: { id: parseInt(id) } });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        await prisma.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: parseInt(id) } });

        const dn = await prisma.deliveryNote.update({
            where: { id: parseInt(id) },
            data: {
                companyId:       companyId ? parseInt(companyId) : existing.companyId,
                invoiceId:       invoiceId !== undefined ? (invoiceId ? parseInt(invoiceId) : null) : existing.invoiceId,
                projectId:       projectId !== undefined ? (projectId ? parseInt(projectId) : null) : existing.projectId,
                deliveryDate:    deliveryDate !== undefined ? (deliveryDate ? new Date(deliveryDate) : null) : existing.deliveryDate,
                customerPoNumber: customerPoNumber !== undefined ? customerPoNumber : existing.customerPoNumber,
                customerPoDate:  customerPoDate !== undefined ? (customerPoDate ? new Date(customerPoDate) : null) : existing.customerPoDate,
                carrier:         carrier !== undefined ? carrier : existing.carrier,
                trackingNumber:  trackingNumber !== undefined ? trackingNumber : existing.trackingNumber,
                incoterms:       incoterms !== undefined ? incoterms : existing.incoterms,
                packageType:     packageType !== undefined ? packageType : existing.packageType,
                packageCount:    packageCount !== undefined ? (packageCount ? parseInt(packageCount) : null) : existing.packageCount,
                weightKg:        weightKg !== undefined ? (weightKg ? parseFloat(weightKg) : null) : existing.weightKg,
                dimensionL:      dimensionL !== undefined ? (dimensionL ? parseFloat(dimensionL) : null) : existing.dimensionL,
                dimensionW:      dimensionW !== undefined ? (dimensionW ? parseFloat(dimensionW) : null) : existing.dimensionW,
                dimensionH:      dimensionH !== undefined ? (dimensionH ? parseFloat(dimensionH) : null) : existing.dimensionH,
                deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
                notes:           notes !== undefined ? notes : existing.notes,
                items: {
                    create: (items || []).map(item => ({
                        productId:     item.productId ? parseInt(item.productId) : null,
                        description:   item.description || '',
                        quantity:      parseFloat(item.quantity) || 0,
                        unitOfMeasure: item.unitOfMeasure || 'units',
                        serialNumbers: item.serialNumbers || null,
                        batchNumber:   item.batchNumber || null,
                        notes:         item.notes || null,
                    })),
                },
            },
            include: {
                company:   { select: { id: true, name: true } },
                items:     true,
                documents: true,
            },
        });
        res.json(dn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const existing = await prisma.deliveryNote.findUnique({
            where: { id: parseInt(id) },
            include: { items: true },
        });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        const updateData = { status };
        if (status === 'SHIPPED') updateData.shippedAt = new Date();
        if (status === 'DELIVERED') updateData.deliveredAt = new Date();

        const dn = await prisma.deliveryNote.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        // Decrement product stock when shipped
        if (status === 'SHIPPED') {
            for (const item of existing.items) {
                if (item.productId) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { quantity: { decrement: parseFloat(item.quantity) } },
                    });
                }
            }
        }

        res.json(dn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteDeliveryNote = async (req, res) => {
    try {
        const { id } = req.params;
        const dn = await prisma.deliveryNote.findUnique({ where: { id: parseInt(id) } });
        if (!dn) return res.status(404).json({ error: 'Not found' });
        if (!['DRAFT', 'CANCELLED'].includes(dn.status)) {
            return res.status(400).json({ error: 'Can only delete DRAFT or CANCELLED delivery notes' });
        }
        await prisma.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: parseInt(id) } });
        await prisma.deliveryNoteDocument.deleteMany({ where: { deliveryNoteId: parseInt(id) } });
        await prisma.deliveryNote.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const doc = await prisma.deliveryNoteDocument.create({
            data: {
                deliveryNoteId: parseInt(id),
                fileName:       req.file.originalname,
                filePath:       req.file.path,
                fileSize:       req.file.size,
                mimeType:       req.file.mimetype,
            },
        });
        res.status(201).json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { docId } = req.params;
        const doc = await prisma.deliveryNoteDocument.findUnique({ where: { id: parseInt(docId) } });
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
        await prisma.deliveryNoteDocument.delete({ where: { id: parseInt(docId) } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getDeliveryNotes, getDeliveryNote, createDeliveryNote, generateFromInvoice,
    updateDeliveryNote, updateStatus, deleteDeliveryNote,
    uploadDocument, deleteDocument,
};
