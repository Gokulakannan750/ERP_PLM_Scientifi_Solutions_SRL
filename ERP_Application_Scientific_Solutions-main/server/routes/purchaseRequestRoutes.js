const express = require('express');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();
const { verifyToken, verifyPermission, verifyAnyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');
const {
    getPurchaseRequests, getPurchaseRequest, createPurchaseRequest,
    updatePurchaseRequest, updateStatus, deletePurchaseRequest,
    uploadDocument, deleteDocument, getStats,
} = require('../controllers/purchaseRequestController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/purchase-requests');
        require('fs').mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken);

router.get('/stats', verifyAnyPermission([PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.VIEW_INVENTORY]), getStats);
router.get('/',      verifyAnyPermission([PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.VIEW_INVENTORY]), getPurchaseRequests);
router.get('/:id',   verifyAnyPermission([PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.VIEW_INVENTORY]), getPurchaseRequest);

router.post('/',   verifyPermission(PERMISSIONS.MANAGE_INVENTORY), createPurchaseRequest);
router.put('/:id', verifyPermission(PERMISSIONS.MANAGE_INVENTORY), updatePurchaseRequest);
router.put('/:id/status', verifyPermission(PERMISSIONS.MANAGE_INVENTORY), updateStatus);
router.delete('/:id', verifyPermission(PERMISSIONS.MANAGE_INVENTORY), deletePurchaseRequest);

router.post('/:id/documents', verifyPermission(PERMISSIONS.MANAGE_INVENTORY), upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', verifyPermission(PERMISSIONS.MANAGE_INVENTORY), deleteDocument);

module.exports = router;
