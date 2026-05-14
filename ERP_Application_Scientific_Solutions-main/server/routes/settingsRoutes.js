const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');

// All routes are protected
router.use(verifyToken);

router.get('/', getSettings);
router.put('/', verifyPermission(PERMISSIONS.MANAGE_SETTINGS || 'MANAGE_SETTINGS'), updateSettings);

module.exports = router;
