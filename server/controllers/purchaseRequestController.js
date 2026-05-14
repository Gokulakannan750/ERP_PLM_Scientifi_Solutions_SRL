const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs   = require('fs');
const prisma = new PrismaClient();

const generateRequestNumber = async (direction) => {
    const prefix = direction === 'INBOUND' ? 'INQ' : 'PR';
    const year = new Date().getFullYear();
    const last = await prisma.purchaseRequest.findFirst({
        where: { requestNumber: { startsWith: `${prefix}-${year}-` } },
        orderBy: { requestNumber: 'desc' },
    });
    const seq = last ? parseInt(last.requestNumber.split('-').pop()) + 1 : 1;
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
};

const getPurchaseRequests = async (req, res) => {
    try {
        const { direction, status, priority, projectId, companyId } = req.query;
        const where = {};
        if (direction)  where.direction  = direction;
        if (status)     where.status     = status;
        if (priority)   where.priority   = priority;
        if (projectId)  where.projectId  = parseInt(projectId);
        if (companyId)  where.companyId  = parseInt(companyId);

        const requests = await prisma.purchaseRequest.findMany({
            where,
            include: {
                product:     { select: { id: true, name: true, sku: true } },
                company:     { select: { id: true, name: true } },
                project:     { select: { id: true, name: true } },
                requestedBy: { select: { id: true, username: true } },
                approvedBy:  { select: { id: true, username: true } },
                documents:   true,
            },
            orderBy: { requestedAt: 'desc' },
        });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getPurchaseRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                product:     { select: { id: true, name: true, sku: true, quantity: true } },
                company:     { select: { id: true, name: true, email: true } },
                project:     { select: { id: true, name: true } },
                requestedBy: { select: { id: true, username: true } },
                approvedBy:  { select: { id: true, username: true } },
                documents:   true,
            },
        });
        if (!pr) return res.status(404).json({ error: 'Purchase request not found' });
        res.json(pr);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createPurchaseRequest = async (req, res) => {
    try {
        const {
            direction, type, productId, freeTextDescription,
            quantity, unitOfMeasure, estimatedUnitPrice,
            requiredByDate, projectId, companyId, priority, notes,
        } = req.body;

        const dir = direction || 'OUTBOUND';
        const requestNumber = await generateRequestNumber(dir);
        const qty  = parseFloat(quantity) || 0;
        const eup  = estimatedUnitPrice ? parseFloat(estimatedUnitPrice) : null;
        const total = eup ? qty * eup : null;

        const pr = await prisma.purchaseRequest.create({
            data: {
                requestNumber,
                direction:          dir,
                type:               type || 'INVENTORY',
                productId:          productId ? parseInt(productId) : null,
                freeTextDescription: freeTextDescription || null,
                quantity:           qty,
                unitOfMeasure:      unitOfMeasure || 'units',
                estimatedUnitPrice: eup,
                totalEstimatedCost: total,
                requiredByDate:     requiredByDate ? new Date(requiredByDate) : null,
                projectId:          projectId ? parseInt(projectId) : null,
                companyId:          companyId ? parseInt(companyId) : null,
                priority:           priority || 'MEDIUM',
                notes:              notes || null,
                requestedByUserId:  req.user?.id || null,
                status:             'RAISED',
            },
            include: {
                product: { select: { id: true, name: true, sku: true } },
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
            },
        });
        res.status(201).json(pr);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updatePurchaseRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type, productId, freeTextDescription, quantity, unitOfMeasure,
            estimatedUnitPrice, requiredByDate, projectId, companyId,
            priority, notes, purchaseOrderNumber, actualUnitPrice,
            actualTotalCost, receivedQuantity,
        } = req.body;

        const existing = await prisma.purchaseRequest.findUnique({ where: { id: parseInt(id) } });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        const qty  = quantity !== undefined ? parseFloat(quantity) : parseFloat(existing.quantity);
        const eup  = estimatedUnitPrice !== undefined ? parseFloat(estimatedUnitPrice) : existing.estimatedUnitPrice ? parseFloat(existing.estimatedUnitPrice) : null;

        const pr = await prisma.purchaseRequest.update({
            where: { id: parseInt(id) },
            data: {
                type:               type || existing.type,
                productId:          productId !== undefined ? (productId ? parseInt(productId) : null) : existing.productId,
                freeTextDescription: freeTextDescription !== undefined ? freeTextDescription : existing.freeTextDescription,
                quantity:           qty,
                unitOfMeasure:      unitOfMeasure || existing.unitOfMeasure,
                estimatedUnitPrice: eup,
                totalEstimatedCost: eup ? qty * eup : null,
                requiredByDate:     requiredByDate !== undefined ? (requiredByDate ? new Date(requiredByDate) : null) : existing.requiredByDate,
                projectId:          projectId !== undefined ? (projectId ? parseInt(projectId) : null) : existing.projectId,
                companyId:          companyId !== undefined ? (companyId ? parseInt(companyId) : null) : existing.companyId,
                priority:           priority || existing.priority,
                notes:              notes !== undefined ? notes : existing.notes,
                purchaseOrderNumber: purchaseOrderNumber !== undefined ? purchaseOrderNumber : existing.purchaseOrderNumber,
                actualUnitPrice:    actualUnitPrice !== undefined ? parseFloat(actualUnitPrice) : existing.actualUnitPrice,
                actualTotalCost:    actualTotalCost !== undefined ? parseFloat(actualTotalCost) : existing.actualTotalCost,
                receivedQuantity:   receivedQuantity !== undefined ? parseFloat(receivedQuantity) : existing.receivedQuantity,
            },
        });
        res.json(pr);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, purchaseOrderNumber, actualUnitPrice, actualTotalCost, receivedQuantity } = req.body;

        const existing = await prisma.purchaseRequest.findUnique({
            where: { id: parseInt(id) },
            include: { product: true },
        });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        const updateData = { status };
        if (status === 'APPROVED') {
            updateData.approvedByUserId = req.user?.id || null;
        }
        if (purchaseOrderNumber) updateData.purchaseOrderNumber = purchaseOrderNumber;
        if (actualUnitPrice !== undefined) updateData.actualUnitPrice = parseFloat(actualUnitPrice);
        if (actualTotalCost !== undefined) updateData.actualTotalCost = parseFloat(actualTotalCost);
        if (receivedQuantity !== undefined) updateData.receivedQuantity = parseFloat(receivedQuantity);

        const pr = await prisma.purchaseRequest.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        // Auto-update product stock when INBOUND request is received
        if (status === 'RECEIVED' && existing.productId && receivedQuantity) {
            const qty = parseFloat(receivedQuantity);
            await prisma.product.update({
                where: { id: existing.productId },
                data: { quantity: { increment: qty } },
            });
        }

        res.json(pr);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deletePurchaseRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const pr = await prisma.purchaseRequest.findUnique({ where: { id: parseInt(id) } });
        if (!pr) return res.status(404).json({ error: 'Not found' });
        if (!['RAISED', 'CANCELLED'].includes(pr.status)) {
            return res.status(400).json({ error: 'Can only delete RAISED or CANCELLED requests' });
        }
        await prisma.purchaseRequestDocument.deleteMany({ where: { purchaseRequestId: parseInt(id) } });
        await prisma.purchaseRequest.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const doc = await prisma.purchaseRequestDocument.create({
            data: {
                purchaseRequestId: parseInt(id),
                fileName:          req.file.originalname,
                filePath:          req.file.path,
                fileSize:          req.file.size,
                mimeType:          req.file.mimetype,
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
        const doc = await prisma.purchaseRequestDocument.findUnique({ where: { id: parseInt(docId) } });
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
        await prisma.purchaseRequestDocument.delete({ where: { id: parseInt(docId) } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getStats = async (req, res) => {
    try {
        const [total, byStatus, byDirection, overdueCount] = await Promise.all([
            prisma.purchaseRequest.count(),
            prisma.purchaseRequest.groupBy({ by: ['status'], _count: { id: true } }),
            prisma.purchaseRequest.groupBy({ by: ['direction'], _count: { id: true }, _sum: { totalEstimatedCost: true } }),
            prisma.purchaseRequest.count({
                where: {
                    requiredByDate: { lt: new Date() },
                    status: { notIn: ['RECEIVED', 'CANCELLED'] },
                },
            }),
        ]);
        res.json({ total, byStatus, byDirection, overdueCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getPurchaseRequests, getPurchaseRequest, createPurchaseRequest,
    updatePurchaseRequest, updateStatus, deletePurchaseRequest,
    uploadDocument, deleteDocument, getStats,
};
