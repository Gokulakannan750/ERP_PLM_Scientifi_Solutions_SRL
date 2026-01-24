const prisma = require('../prismaClient');
const logger = require('../utils/logger');

const getProducts = async (req, res) => {
    try {
        // Only return latest versions
        const products = await prisma.product.findMany({
            where: { isLatest: true },
            include: {
                supplier: true,
                modifiedBy: { select: { id: true, email: true, name: true } }
            },
            orderBy: { recDate: 'desc' }
        });

        // Calculate version number for each product
        const productsWithVersion = await Promise.all(products.map(async (product) => {
            let versionCount = 1;
            let currentId = product.lastRecID;

            while (currentId) {
                versionCount++;
                const prev = await prisma.product.findUnique({
                    where: { id: currentId },
                    select: { lastRecID: true }
                });
                currentId = prev?.lastRecID || null;
            }

            return { ...product, version: versionCount };
        }));

        res.json(productsWithVersion);
    } catch (err) {
        logger.error(`Error fetching products: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                supplier: true,
                modifiedBy: { select: { id: true, email: true, name: true } }
            }
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        logger.error(`Error fetching product: ${err.message}`);
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
                minLevel: parseInt(minLevel) || 5,
                maxLevel: parseInt(maxLevel) || 100,
                supplierId: supplierId ? parseInt(supplierId) : null,
                modifiedByUserId: req.user.userId, // From JWT
                isLatest: true
            },
            include: {
                supplier: true,
                modifiedBy: { select: { id: true, email: true, name: true } }
            }
        });

        logger.info(`Product created: ${product.name} (ID: ${product.id}) by User ${req.user.userId}`);
        res.json(product);
    } catch (err) {
        logger.error(`Error creating product: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { name, sku, description, price, quantity, minLevel, maxLevel, supplierId } = req.body;

        // Get current latest version
        const currentProduct = await prisma.product.findFirst({
            where: {
                id: productId,
                isLatest: true
            }
        });

        if (!currentProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Mark current version as no longer latest
        await prisma.product.update({
            where: { id: productId },
            data: { isLatest: false }
        });

        // Create new version
        const newVersion = await prisma.product.create({
            data: {
                name,
                sku,
                description,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                minLevel: parseInt(minLevel) || 5,
                maxLevel: parseInt(maxLevel) || 100,
                supplierId: supplierId ? parseInt(supplierId) : null,
                lastRecID: productId,              // Link to previous version
                modifiedByUserId: req.user.userId,
                isLatest: true
            },
            include: {
                supplier: true,
                modifiedBy: { select: { id: true, email: true, name: true } }
            }
        });

        logger.info(`Product updated: ${newVersion.name} (New ID: ${newVersion.id}, Previous ID: ${productId}) by User ${req.user.userId}`);
        res.json(newVersion);
    } catch (err) {
        logger.error(`Error updating product: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Mark as not latest instead of deleting
        await prisma.product.update({
            where: { id: parseInt(id) },
            data: { isLatest: false }
        });
        logger.info(`Product soft-deleted (ID: ${id})`);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        logger.error(`Error deleting product: ${err.message}`);
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
            const product = await prisma.product.findFirst({
                where: { id: productId, isLatest: true }
            });
            if (!product) throw new Error('Product not found');

            let newQuantity = product.quantity;
            if (type === 'IN') newQuantity += qty;
            else if (type === 'OUT') newQuantity -= qty;
            else throw new Error('Invalid movement type');

            // Create new version with updated quantity
            await prisma.product.update({
                where: { id: productId },
                data: { isLatest: false }
            });

            const updatedProduct = await prisma.product.create({
                data: {
                    ...product,
                    id: undefined, // Let DB auto-increment
                    quantity: newQuantity,
                    lastRecID: productId,
                    modifiedByUserId: req.user.userId,
                    isLatest: true
                }
            });

            // Log Movement
            await prisma.stockMovement.create({
                data: {
                    productId: updatedProduct.id,
                    type,
                    quantity: qty,
                    reason
                }
            });

            return updatedProduct;
        });

        logger.info(`Stock adjusted for product ID ${productId}: ${type} ${quantity}`);
        res.json(result);
    } catch (err) {
        logger.error(`Error adjusting stock: ${err.message}`);
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
        logger.error(`Error fetching stock history: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// NEW: Get product version history
const getProductHistory = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        // Get the product (could be any version)
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // If this is not the latest, find the latest version
        let latestId = productId;
        if (!product.isLatest) {
            // Find the latest in this chain
            let current = product;
            while (current) {
                const next = await prisma.product.findFirst({
                    where: {
                        lastRecID: current.id,
                        isLatest: true
                    }
                });
                if (next) {
                    latestId = next.id;
                    break;
                }
                // Check if there's another version
                const nextVersion = await prisma.product.findFirst({
                    where: { lastRecID: current.id }
                });
                if (!nextVersion) break;
                current = nextVersion;
            }
        }

        // Build version history chain from latest to oldest
        const history = [];
        let currentId = latestId;

        while (currentId) {
            const version = await prisma.product.findUnique({
                where: { id: currentId },
                include: {
                    supplier: true,
                    modifiedBy: { select: { id: true, email: true, name: true } }
                }
            });

            if (!version) break;
            history.push(version);
            currentId = version.lastRecID;
        }

        logger.info(`Fetched version history for product ID ${productId}: ${history.length} versions`);
        res.json(history);
    } catch (error) {
        logger.error(`Error fetching product history: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch product history' });
    }
};

module.exports = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    getHistory,
    getProductHistory  // NEW
};
