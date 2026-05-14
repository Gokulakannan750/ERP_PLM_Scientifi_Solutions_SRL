const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/creditNoteController');
const { verifyToken, verifyPermission, verifyAnyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');

router.use(verifyToken);

router.get('/',    verifyAnyPermission([PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.VIEW_INVOICES]), ctrl.getCreditNotes);
router.post('/',   verifyPermission(PERMISSIONS.MANAGE_INVOICES), ctrl.createCreditNote);
router.get('/:id', verifyAnyPermission([PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.VIEW_INVOICES]), ctrl.getCreditNote);
router.post('/:id/issue', verifyPermission(PERMISSIONS.MANAGE_INVOICES), ctrl.issueCreditNote);
router.post('/:id/apply', verifyPermission(PERMISSIONS.MANAGE_INVOICES), ctrl.applyCreditNote);
router.delete('/:id',     verifyPermission(PERMISSIONS.MANAGE_INVOICES), ctrl.deleteCreditNote);

module.exports = router;
