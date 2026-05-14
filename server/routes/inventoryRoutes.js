const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/authMiddleware');

// Product CRUD
router.get('/', verifyToken, inventoryController.getProducts);
router.get('/:id', verifyToken, inventoryController.getProduct);
router.post('/', verifyToken, inventoryController.createProduct);
router.put('/:id', verifyToken, inventoryController.updateProduct);
router.delete('/:id', verifyToken, inventoryController.deleteProduct);

// Stock Operations
router.post('/:id/check-in', verifyToken, inventoryController.checkInStock);
router.post('/:id/check-out', verifyToken, inventoryController.checkOutStock);
router.get('/:id/history', verifyToken, inventoryController.getHistory);
router.get('/:id/versions', verifyToken, inventoryController.getProductHistory); // NEW: Version history

// SKU preview (auto-generate from category+subcategory)
router.get('/sku/preview', verifyToken, inventoryController.previewSku);

// Stock report — current levels, reorder items, 7-day movement summary
router.get('/report', verifyToken, inventoryController.getStockReport);

// Purchase cost analysis + TCO for a single product
router.get('/:id/cost-analysis', verifyToken, inventoryController.getCostAnalysis);

module.exports = router;
