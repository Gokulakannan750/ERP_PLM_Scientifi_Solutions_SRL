const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const {
  getCategories, createCategory, updateCategory, deleteCategory,
  createSubcategory, deleteSubcategory
} = require('../controllers/productCategoryController');

router.get('/', verifyToken, getCategories);
router.post('/', verifyToken, verifyAdmin, createCategory);
router.put('/:id', verifyToken, verifyAdmin, updateCategory);
router.delete('/:id', verifyToken, verifyAdmin, deleteCategory);
router.post('/:id/subcategories', verifyToken, verifyAdmin, createSubcategory);
router.delete('/:id/subcategories/:subId', verifyToken, verifyAdmin, deleteSubcategory);

module.exports = router;
