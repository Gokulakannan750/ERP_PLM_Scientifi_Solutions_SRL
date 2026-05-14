const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, getInvoice, updateStatus, recordPayment, sendInvoice, sendReminder, createFromOffer, updateInvoice, deleteInvoice, getRevenueReport } = require('../controllers/invoiceController');
const { verifyToken, verifyPermission, verifyAnyPermission } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createInvoiceSchema } = require('../validators/schemas');
const PERMISSIONS = require('../constants/permissions');

router.post('/',            verifyPermission(PERMISSIONS.MANAGE_INVOICES), validate(createInvoiceSchema), createInvoice);
router.get('/',             verifyAnyPermission([PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.VIEW_INVOICES]), getInvoices);
router.get('/revenue',      verifyAnyPermission([PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.VIEW_INVOICES]), getRevenueReport);
router.post('/from-offer',  verifyPermission(PERMISSIONS.MANAGE_INVOICES), createFromOffer);
router.get('/:id',          verifyAnyPermission([PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.VIEW_INVOICES]), getInvoice);
router.put('/:id',          verifyPermission(PERMISSIONS.MANAGE_INVOICES), updateInvoice);
router.put('/:id/status',   verifyPermission(PERMISSIONS.MANAGE_INVOICES), updateStatus);
router.put('/:id/payment',   verifyPermission(PERMISSIONS.MANAGE_INVOICES), recordPayment);
router.post('/:id/send',     verifyPermission(PERMISSIONS.MANAGE_INVOICES), sendInvoice);
router.post('/:id/reminder', verifyPermission(PERMISSIONS.MANAGE_INVOICES), sendReminder);
router.delete('/:id',        verifyPermission(PERMISSIONS.MANAGE_INVOICES), deleteInvoice);

module.exports = router;
