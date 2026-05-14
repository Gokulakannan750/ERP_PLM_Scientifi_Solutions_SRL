const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, verifyAnyPermission } = require('../middleware/authMiddleware');
const {
  getCompanies, getCompany, createCompany, updateCompany, deleteCompany,
  addAddress, updateAddress, deleteAddress,
  getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount,
  getDocuments, uploadDocument, deleteDocument,
  getChangeLog, getLinkedInvoices, getLinkedOffers
} = require('../controllers/companyController');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'companies');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

const canView = verifyAnyPermission(['MANAGE_COMPANIES', 'VIEW_COMPANIES']);
const canManage = verifyAnyPermission(['MANAGE_COMPANIES']);

// ─── Core CRUD ────────────────────────────────────────────────
router.get('/', verifyToken, canView, getCompanies);
router.post('/', verifyToken, canManage, createCompany);
router.get('/:id', verifyToken, canView, getCompany);
router.put('/:id', verifyToken, canManage, updateCompany);
router.delete('/:id', verifyToken, canManage, deleteCompany);

// ─── Addresses ────────────────────────────────────────────────
router.post('/:id/addresses', verifyToken, canManage, addAddress);
router.put('/:id/addresses/:addressId', verifyToken, canManage, updateAddress);
router.delete('/:id/addresses/:addressId', verifyToken, canManage, deleteAddress);

// ─── Bank Accounts ────────────────────────────────────────────
router.get('/:id/bank-accounts', verifyToken, canView, getBankAccounts);
router.post('/:id/bank-accounts', verifyToken, canManage, createBankAccount);
router.put('/:id/bank-accounts/:bankId', verifyToken, canManage, updateBankAccount);
router.delete('/:id/bank-accounts/:bankId', verifyToken, canManage, deleteBankAccount);

// ─── Documents ────────────────────────────────────────────────
router.get('/:id/documents', verifyToken, canView, getDocuments);
router.post('/:id/documents', verifyToken, canManage, upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', verifyToken, canManage, deleteDocument);

// ─── Change Log ───────────────────────────────────────────────
router.get('/:id/changelog', verifyToken, canView, getChangeLog);

// ─── Linked Records ───────────────────────────────────────────
router.get('/:id/invoices', verifyToken, canView, getLinkedInvoices);
router.get('/:id/offers', verifyToken, canView, getLinkedOffers);

module.exports = router;
