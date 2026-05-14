const express = require('express');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();
const { verifyToken, verifyPermission, verifyAnyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');
const {
    getDeliveryNotes, getDeliveryNote, createDeliveryNote, generateFromInvoice,
    updateDeliveryNote, updateStatus, deleteDeliveryNote,
    uploadDocument, deleteDocument,
} = require('../controllers/deliveryNoteController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/delivery-notes');
        require('fs').mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken);

router.get('/',    verifyAnyPermission([PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.VIEW_INVOICES]), getDeliveryNotes);
router.get('/:id', verifyAnyPermission([PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.VIEW_INVOICES]), getDeliveryNote);

router.post('/',                  verifyPermission(PERMISSIONS.MANAGE_INVOICES), createDeliveryNote);
router.post('/from-invoice',      verifyPermission(PERMISSIONS.MANAGE_INVOICES), generateFromInvoice);
router.put('/:id',                verifyPermission(PERMISSIONS.MANAGE_INVOICES), updateDeliveryNote);
router.put('/:id/status',         verifyPermission(PERMISSIONS.MANAGE_INVOICES), updateStatus);
router.delete('/:id',             verifyPermission(PERMISSIONS.MANAGE_INVOICES), deleteDeliveryNote);

router.post('/:id/documents',               verifyPermission(PERMISSIONS.MANAGE_INVOICES), upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId',      verifyPermission(PERMISSIONS.MANAGE_INVOICES), deleteDocument);

module.exports = router;
