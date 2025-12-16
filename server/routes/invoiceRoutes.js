const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, getInvoice, updateStatus, createFromOffer } = require('../controllers/invoiceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, createInvoice);
router.get('/', verifyToken, getInvoices);
router.post('/from-offer', verifyToken, createFromOffer);
router.get('/:id', verifyToken, getInvoice);
router.put('/:id/status', verifyToken, updateStatus);

module.exports = router;
