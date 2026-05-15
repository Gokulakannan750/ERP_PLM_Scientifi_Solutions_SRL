const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyAnyPermission, verifyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');

const canView = verifyAnyPermission([PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.VIEW_INVENTORY]);
const canManage = verifyPermission(PERMISSIONS.MANAGE_INVENTORY);

// Product CRUD
router.get('/', canView, inventoryController.getProducts);
router.get('/:id', canView, inventoryController.getProduct);
router.post('/', canManage, inventoryController.createProduct);
router.put('/:id', canManage, inventoryController.updateProduct);
router.delete('/:id', canManage, inventoryController.deleteProduct);

// Stock Operations
router.post('/:id/check-in', canManage, inventoryController.checkInStock);
router.post('/:id/check-out', canManage, inventoryController.checkOutStock);
router.get('/:id/history', canView, inventoryController.getHistory);
router.get('/:id/versions', canView, inventoryController.getProductHistory);

// SKU preview (auto-generate from category+subcategory)
router.get('/sku/preview', canView, inventoryController.previewSku);

// Stock report — current levels, reorder items, 7-day movement summary
router.get('/report', canView, inventoryController.getStockReport);

// Purchase cost analysis + TCO for a single product
router.get('/:id/cost-analysis', canView, inventoryController.getCostAnalysis);

module.exports = router;
