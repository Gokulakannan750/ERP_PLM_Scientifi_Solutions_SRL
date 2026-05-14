const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const formatItems = (items) => {
    let subtotal = 0;
    const formatted = items.map(item => {
        const gross    = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
        const disc     = Math.min(100, Math.max(0, parseFloat(item.discountPercent) || 0));
        const lineTotal = gross * (1 - disc / 100);
        subtotal += lineTotal;
        let pid = null;
        if (item.productId && item.productId !== '' && item.productId !== 'null') {
            pid = parseInt(item.productId);
            if (isNaN(pid)) pid = null;
        }
        return {
            productId:       pid,
            description:     item.description,
            quantity:        parseInt(item.quantity) || 0,
            unitPrice:       parseFloat(item.unitPrice) || 0,
            discountPercent: disc,
            totalPrice:      lineTotal,
        };
    });
    return { formatted, subtotal };
};

const createOffer = async (req, res) => {
    try {
        const { companyId, items, validUntil, description } = req.body;

        if (!companyId) return res.status(400).json({ error: 'Company ID is required' });
        const parsedCompanyId = parseInt(companyId);
        if (isNaN(parsedCompanyId)) return res.status(400).json({ error: 'Invalid Company ID' });

        const company = await prisma.company.findUnique({
            where:  { id: parsedCompanyId },
            select: { vatPercentage: true, paymentTerms: true, incoterms: true }
        });

        const { formatted: formattedItems, subtotal } = formatItems(items || []);

        const result = await prisma.$transaction(async (tx) => {
            const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count     = await tx.offer.count();
            const offerNumber = `OFF-${dateStr}-${count + 1}`;

            const taxRateVal = req.body.taxRate != null
                ? parseFloat(req.body.taxRate)
                : (company?.vatPercentage ? parseFloat(String(company.vatPercentage)) : 0);
            const finalTotal = subtotal * (1 + taxRateVal / 100);

            const offer = await tx.offer.create({
                data: {
                    offerNumber,
                    companyId:   parsedCompanyId,
                    totalAmount: finalTotal,
                    taxRate:     taxRateVal,
                    validUntil:  validUntil ? new Date(validUntil) : null,
                    description: description || '',
                    version:     1,
                    items:       { create: formattedItems }
                },
                include: { items: true, company: true }
            });

            for (const item of formattedItems) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data:  { reserved: { increment: item.quantity } }
                    });
                }
            }
            return offer;
        });

        res.json({
            ...result,
            _companyMeta: {
                paymentTerms: company?.paymentTerms || null,
                incoterms:    company?.incoterms    || null,
            }
        });
    } catch (err) {
        if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid Company ID or Product ID referenced.' });
        res.status(500).json({ error: err.message });
    }
};

const getOffers = async (req, res) => {
    try {
        const { status, companyId } = req.query;
        const where = {};
        if (status)    where.status    = status;
        if (companyId) where.companyId = parseInt(companyId);
        const offers = await prisma.offer.findMany({
            where,
            include: { company: true, items: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(offers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await prisma.offer.findUnique({
            where:   { id: parseInt(id) },
            include: { company: true, items: { include: { product: true } }, invoice: true }
        });
        if (!offer) return res.status(404).json({ error: 'Offer not found' });
        res.json(offer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id }     = req.params;
        const { status } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const offer = await tx.offer.findUnique({
                where:   { id: parseInt(id) },
                include: { items: true }
            });
            if (!offer) throw new Error('Offer not found');

            const oldStatus = offer.status;
            if (oldStatus === status) return offer;

            const wasReserved = ['DRAFT', 'SENT'].includes(oldStatus);
            const isReserved  = ['DRAFT', 'SENT'].includes(status);
            const wasSold     = oldStatus === 'ACCEPTED';
            const isSold      = status    === 'ACCEPTED';

            for (const item of offer.items) {
                if (!item.productId) continue;
                let reservedChange = 0;
                let quantityChange = 0;
                if (wasReserved && !isReserved)  reservedChange -= item.quantity;
                else if (!wasReserved && isReserved) reservedChange += item.quantity;
                if (wasSold && !isSold)   quantityChange += item.quantity;
                else if (!wasSold && isSold) quantityChange -= item.quantity;
                if (reservedChange !== 0 || quantityChange !== 0) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data:  { reserved: { increment: reservedChange }, quantity: { increment: quantityChange } }
                    });
                }
            }
            return await tx.offer.update({ where: { id: parseInt(id) }, data: { status } });
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const rejectOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const offerId = parseInt(id);

        const result = await prisma.$transaction(async (tx) => {
            const offer = await tx.offer.findUnique({ where: { id: offerId }, include: { items: true } });
            if (!offer) throw new Error('Offer not found');

            // Release any stock reservations
            for (const item of offer.items) {
                if (item.productId && ['DRAFT', 'SENT'].includes(offer.status)) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data:  { reserved: { decrement: item.quantity } }
                    });
                }
            }
            return await tx.offer.update({
                where: { id: offerId },
                data:  { status: 'REJECTED', rejectionReason: rejectionReason || null }
            });
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const duplicateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offerId = parseInt(id);

        const source = await prisma.offer.findUnique({
            where:   { id: offerId },
            include: { items: true }
        });
        if (!source) return res.status(404).json({ error: 'Offer not found' });

        const dateStr     = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count       = await prisma.offer.count();
        const offerNumber = `OFF-${dateStr}-${count + 1}`;

        const newOffer = await prisma.offer.create({
            data: {
                offerNumber,
                companyId:    source.companyId,
                totalAmount:  source.totalAmount,
                taxRate:      source.taxRate,
                validUntil:   source.validUntil,
                description:  source.description,
                status:       'DRAFT',
                version:      1,
                parentOfferId: source.id,
                items: {
                    create: source.items.map(item => ({
                        productId:       item.productId,
                        description:     item.description,
                        quantity:        item.quantity,
                        unitPrice:       item.unitPrice,
                        discountPercent: item.discountPercent ?? 0,
                        totalPrice:      item.totalPrice,
                    }))
                }
            },
            include: { items: true, company: true }
        });

        res.status(201).json(newOffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, items, validUntil, description, taxRate } = req.body;
        const offerId = parseInt(id);

        const result = await prisma.$transaction(async (tx) => {
            const existingOffer = await tx.offer.findUnique({
                where:   { id: offerId },
                include: { items: true }
            });
            if (!existingOffer) throw new Error('Offer not found');

            // Release old reservations
            for (const item of existingOffer.items) {
                if (item.productId && ['DRAFT', 'SENT'].includes(existingOffer.status)) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data:  { reserved: { decrement: item.quantity } }
                    });
                }
            }

            await tx.offerItem.deleteMany({ where: { offerId } });

            const { formatted: formattedItems, subtotal } = formatItems(items || []);
            const taxRateVal = parseFloat(taxRate) || 0;
            const finalTotal = subtotal * (1 + taxRateVal / 100);

            if (['DRAFT', 'SENT'].includes(existingOffer.status)) {
                for (const item of formattedItems) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data:  { reserved: { increment: item.quantity } }
                        });
                    }
                }
            }

            return await tx.offer.update({
                where: { id: offerId },
                data: {
                    companyId:   companyId ? parseInt(companyId) : undefined,
                    totalAmount: finalTotal,
                    taxRate:     taxRateVal,
                    validUntil:  validUntil ? new Date(validUntil) : null,
                    description: description || '',
                    version:     { increment: 1 },
                    items:       { create: formattedItems }
                },
                include: { items: true, company: true }
            });
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteOffer = async (req, res) => {
    try {
        const { id }  = req.params;
        const offerId = parseInt(id);

        await prisma.$transaction(async (tx) => {
            const offer = await tx.offer.findUnique({ where: { id: offerId }, include: { items: true } });
            if (!offer) throw new Error('Offer not found');

            if (['DRAFT', 'SENT'].includes(offer.status)) {
                for (const item of offer.items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data:  { reserved: { decrement: item.quantity } }
                        });
                    }
                }
            }
            await tx.offerItem.deleteMany({ where: { offerId } });
            await tx.offer.delete({ where: { id: offerId } });
        });

        res.json({ message: 'Offer deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createOffer, getOffers, getOffer, updateStatus, rejectOffer, duplicateOffer, updateOffer, deleteOffer };
