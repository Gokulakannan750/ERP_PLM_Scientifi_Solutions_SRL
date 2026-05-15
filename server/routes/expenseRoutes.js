const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const router   = express.Router();
const { verifyToken, verifyPermission, verifyAnyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');
const {
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    updateStatus,
    deleteExpense,
    getSummary,
} = require('../controllers/expenseController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/expenses');
        require('fs').mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|pdf/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
                   allowed.test(file.mimetype);
        cb(ok ? null : new Error('File type not allowed'), ok);
    },
});

const canView   = verifyAnyPermission([PERMISSIONS.MANAGE_EXPENSES, PERMISSIONS.VIEW_EXPENSES]);
const canManage = verifyPermission(PERMISSIONS.MANAGE_EXPENSES);

router.use(verifyToken);

router.get('/summary', canView, getSummary);
router.get('/',         canView, getExpenses);
router.get('/:id',      canView, getExpense);

router.post('/',        canManage, upload.single('receipt'), createExpense);
router.put('/:id',      canManage, upload.single('receipt'), updateExpense);
router.put('/:id/status', canManage, updateStatus);
router.delete('/:id',   canManage, deleteExpense);

module.exports = router;
