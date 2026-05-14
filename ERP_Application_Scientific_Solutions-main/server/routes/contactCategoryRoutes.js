const express = require('express');
const router = express.Router();
const controller = require('../controllers/contactCategoryController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, controller.getCategories);
router.post('/', verifyAdmin, controller.createCategory);
router.put('/:id', verifyAdmin, controller.updateCategory);
router.delete('/:id', verifyAdmin, controller.deleteCategory);

module.exports = router;
