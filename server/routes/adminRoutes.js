const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyToken } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/schemas');
const {
    getAllUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserPermissions,
    updateUserPermissions,
    getAllPermissions,
    getAuditLog,
} = require('../controllers/adminController');

// User management routes (ADMIN only) with validation
router.get('/users', verifyAdmin, getAllUsers);
router.get('/users/:id', verifyAdmin, getUser);
router.post('/users', verifyAdmin, validate(createUserSchema), createUser);
router.put('/users/:id', verifyAdmin, validate(updateUserSchema), updateUser);
router.delete('/users/:id', verifyAdmin, deleteUser);

// Permission management routes
router.get('/users/:id/permissions', verifyToken, getUserPermissions);
router.put('/users/:id/permissions', verifyAdmin, updateUserPermissions);
router.get('/permissions', verifyToken, getAllPermissions);

// System-wide audit log (ADMIN only)
router.get('/audit', verifyAdmin, getAuditLog);

module.exports = router;
