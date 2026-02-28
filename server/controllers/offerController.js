const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fs = require('fs');

const createOffer = async (req, res) => {
    try {
        console.log('Received Create Offer Request:', JSON.stringify(req.body, null, 2));
        fs.writeFileSync('debug_offer_payload.json', JSON.stringify(req.body, null, 2));
        const { companyId, items, validUntil, description } = req.body;
        // items: [{ productId, description, quantity, unitPrice }]

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }

        const parsedCompanyId = parseInt(companyId);
        if (isNaN(parsedCompanyId)) {
            return res.status(400).json({ error: 'Invalid Company ID' });
        }

        let totalAmount = 0;
        const formattedItems = items.map(item => {
            const lineTotal = item.quantity * item.unitPrice;
            totalAmount += lineTotal;

            // Handle Product ID
            let pid = null;
            if (item.productId && item.productId !== '' && item.productId !== 'null') {
                pid = parseInt(item.productId);
                if (isNaN(pid)) pid = null;
            }

            return {
                productId: pid,
                description: item.description,
                quantity: parseInt(item.quantity) || 0,
                unitPrice: parseFloat(item.unitPrice) || 0,
                totalPrice: lineTotal
            };
        });

        console.log('Formatted Items:', JSON.stringify(formattedItems, null, 2));

        const result = await prisma.$transaction(async (prisma) => {
            // 1. Generate Offer Number
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await prisma.offer.count();
            const offerNumber = `OFF - ${dateStr} -${count + 1} `;

            // 2. Create Offer
            // Apply Tax
            const taxRateVal = parseFloat(req.body.taxRate) || 0;
            const taxAmount = totalAmount * (taxRateVal / 100);
            const finalTotal = totalAmount + taxAmount;

            const offer = await prisma.offer.create({
                data: {
                    offerNumber,
                    companyId: parsedCompanyId,
                    totalAmount: finalTotal,
                    taxRate: taxRateVal,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    description: description || '', // Added description field
                    items: {
                        create: formattedItems
                    }
                },
                include: { items: true, company: true }
            });

            // 3. Reserve Stock for linked products
            for (const item of formattedItems) {
                if (item.productId) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: {
                            reserved: { increment: item.quantity }
                        }
                    });
                }
            }

            return offer;
        });

        res.json(result);
    } catch (err) {
        console.error('Create Offer Error:', err);
        // Check for specific Prisma errors
        if (err.code === 'P2003') { // Foreign key constraint failed
            return res.status(400).json({ error: 'Invalid Company ID or Product ID referenced.' });
        }
        res.status(500).json({ error: err.message });
    }
};

const getOffers = async (req, res) => {
    try {
        const offers = await prisma.offer.findMany({
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
            where: { id: parseInt(id) },
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
        const { id } = req.params;
        const { status } = req.body; // DRAFT, SENT, ACCEPTED, REJECTED

        const result = await prisma.$transaction(async (prisma) => {
            // 1. Get current offer state
            const offer = await prisma.offer.findUnique({
                where: { id: parseInt(id) },
                include: { items: true }
            });

            if (!offer) throw new Error('Offer not found');

            const oldStatus = offer.status;
            const newStatus = status;

            // If status is same, just return
            if (oldStatus === newStatus) return offer;

            // 2. Determine Stock Actions
            // Active Reservation States: DRAFT, SENT
            // No Reservation States: ACCEPTED (Sold), REJECTED (Released)
            const wasReserved = ['DRAFT', 'SENT'].includes(oldStatus);
            const isReserved = ['DRAFT', 'SENT'].includes(newStatus);

            const wasSold = oldStatus === 'ACCEPTED';
            const isSold = newStatus === 'ACCEPTED';

            for (const item of offer.items) {
                if (!item.productId) continue;

                let reservedChange = 0;
                let quantityChange = 0;

                // Handle Reservation Change
                if (wasReserved && !isReserved) {
                    reservedChange -= item.quantity; // Release reservation
                } else if (!wasReserved && isReserved) {
                    reservedChange += item.quantity; // Restore reservation
                }

                // Handle Sale Change
                if (wasSold && !isSold) {
                    quantityChange += item.quantity; // Restock (Return)
                } else if (!wasSold && isSold) {
                    quantityChange -= item.quantity; // Deduct Stock (Sale)
                }

                if (reservedChange !== 0 || quantityChange !== 0) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: {
                            reserved: { increment: reservedChange },
                            quantity: { increment: quantityChange }
                        }
                    });
                }
            }

            // 3. Update Offer Status
            return await prisma.offer.update({
                where: { id: parseInt(id) },
                data: { status }
            });
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Full update of an offer (items, validUntil, description, taxRate)
const updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, items, validUntil, description, taxRate } = req.body;
        const offerId = parseInt(id);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Get existing offer items for stock adjustment
            const existingOffer = await tx.offer.findUnique({
                where: { id: offerId },
                include: { items: true }
            });
            if (!existingOffer) throw new Error('Offer not found');

            // 2. Release old reservations
            for (const item of existingOffer.items) {
                if (item.productId && ['DRAFT', 'SENT'].includes(existingOffer.status)) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { reserved: { decrement: item.quantity } }
                    });
                }
            }

            // 3. Delete old items
            await tx.offerItem.deleteMany({ where: { offerId } });

            // 4. Recalculate total
            let totalAmount = 0;
            const formattedItems = items.map(item => {
                const lineTotal = item.quantity * item.unitPrice;
                totalAmount += lineTotal;
                let pid = null;
                if (item.productId && item.productId !== '' && item.productId !== 'null') {
                    pid = parseInt(item.productId);
                    if (isNaN(pid)) pid = null;
                }
                return {
                    productId: pid,
                    description: item.description,
                    quantity: parseInt(item.quantity) || 0,
                    unitPrice: parseFloat(item.unitPrice) || 0,
                    totalPrice: lineTotal
                };
            });

            const taxRateVal = parseFloat(taxRate) || 0;
            const taxAmount = totalAmount * (taxRateVal / 100);
            const finalTotal = totalAmount + taxAmount;

            // 5. Reserve stock for new items (if still in reservable status)
            if (['DRAFT', 'SENT'].includes(existingOffer.status)) {
                for (const item of formattedItems) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { reserved: { increment: item.quantity } }
                        });
                    }
                }
            }

            // 6. Update offer + create new items
            return await tx.offer.update({
                where: { id: offerId },
                data: {
                    companyId: companyId ? parseInt(companyId) : undefined,
                    totalAmount: finalTotal,
                    taxRate: taxRateVal,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    description: description || '',
                    items: { create: formattedItems }
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

// Delete an offer (release stock reservations, cascade delete items)
const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offerId = parseInt(id);

        await prisma.$transaction(async (tx) => {
            const offer = await tx.offer.findUnique({
                where: { id: offerId },
                include: { items: true }
            });
            if (!offer) throw new Error('Offer not found');

            // Release reservations if still in reservable status
            if (['DRAFT', 'SENT'].includes(offer.status)) {
                for (const item of offer.items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { reserved: { decrement: item.quantity } }
                        });
                    }
                }
            }

            await tx.offerItem.deleteMany({ where: { offerId } });
            await tx.offer.delete({ where: { id: offerId } });
        });

        res.json({ message: 'Offer deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createOffer, getOffers, getOffer, updateStatus, updateOffer, deleteOffer };
