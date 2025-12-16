const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createOffer = async (req, res) => {
    try {
        const { companyId, items, validUntil } = req.body;
        // items: [{ productId, description, quantity, unitPrice }]

        // Calculate total & Prepare Items
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

        const result = await prisma.$transaction(async (prisma) => {
            // 1. Generate Offer Number
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await prisma.offer.count();
            const offerNumber = `OFF-${dateStr}-${count + 1}`;

            // 2. Create Offer
            const offer = await prisma.offer.create({
                data: {
                    offerNumber,
                    companyId: parseInt(companyId),
                    totalAmount,
                    validUntil: validUntil ? new Date(validUntil) : null,
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
        console.error(err);
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

module.exports = { createOffer, getOffers, getOffer, updateStatus };
