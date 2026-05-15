const express = require('express');
const router = express.Router();
const controller = require('../controllers/contactController');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');

router.get('/', verifyToken, controller.getContacts);
router.get('/:id', verifyToken, controller.getContact);
router.post('/', verifyPermission(PERMISSIONS.MANAGE_CONTACTS), controller.createContact);
router.put('/:id', verifyPermission(PERMISSIONS.MANAGE_CONTACTS), controller.updateContact);
router.delete('/:id', verifyPermission(PERMISSIONS.MANAGE_CONTACTS), controller.deleteContact);

module.exports = router;
