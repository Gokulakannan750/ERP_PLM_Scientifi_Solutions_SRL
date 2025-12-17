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
router.post('/:id/adjust', verifyToken, inventoryController.adjustStock);
router.get('/:id/history', verifyToken, inventoryController.getHistory);
router.get('/:id/versions', verifyToken, inventoryController.getProductHistory); // NEW: Version history

module.exports = router;
