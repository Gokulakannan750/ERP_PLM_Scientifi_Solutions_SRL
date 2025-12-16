const prisma = require('../prismaClient');

const getProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: { supplier: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: { supplier: true }
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createProduct = async (req, res) => {
    try {
        const { name, sku, description, price, quantity, minLevel, maxLevel, supplierId } = req.body;
        const product = await prisma.product.create({
            data: {
                name,
                sku,
                description,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                minLevel: parseInt(minLevel),
                maxLevel: parseInt(maxLevel),
                supplierId: supplierId ? parseInt(supplierId) : null
            },
            include: { supplier: true }
        });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, description, price, quantity, minLevel, maxLevel, supplierId } = req.body;
        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                sku,
                description,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                minLevel: parseInt(minLevel),
                maxLevel: parseInt(maxLevel),
                supplierId: supplierId ? parseInt(supplierId) : null
            },
            include: { supplier: true }
        });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, reason } = req.body; // type: 'IN' or 'OUT'

        const productId = parseInt(id);
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Invalid quantity' });

        // Transaction to update stock and log movement
        const result = await prisma.$transaction(async (prisma) => {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (!product) throw new Error('Product not found');

            let newQuantity = product.quantity;
            if (type === 'IN') newQuantity += qty;
            else if (type === 'OUT') newQuantity -= qty;
            else return; // Should handle this validation better

            // Update Product
            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: { quantity: newQuantity }
            });

            // Log Movement
            await prisma.stockMovement.create({
                data: {
                    productId,
                    type,
                    quantity: qty,
                    reason
                }
            });

            return updatedProduct;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const movements = await prisma.stockMovement.findMany({
            where: { productId: parseInt(id) },
            orderBy: { createdAt: 'desc' }
        });
        res.json(movements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, adjustStock, getHistory };
