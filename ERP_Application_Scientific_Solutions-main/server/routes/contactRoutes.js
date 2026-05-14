const express = require('express');
const router = express.Router();
const controller = require('../controllers/contactController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, controller.getContacts);
router.get('/:id', verifyToken, controller.getContact);
router.post('/', verifyToken, controller.createContact);
router.put('/:id', verifyToken, controller.updateContact);
router.delete('/:id', verifyToken, controller.deleteContact);

module.exports = router;
