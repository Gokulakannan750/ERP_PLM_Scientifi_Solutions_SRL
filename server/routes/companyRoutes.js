const express = require('express');
const router = express.Router();
const controller = require('../controllers/companyController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, controller.getCompanies);
router.get('/:id', verifyToken, controller.getCompany);
router.post('/', verifyToken, controller.createCompany);
router.put('/:id', verifyToken, controller.updateCompany);
router.delete('/:id', verifyToken, controller.deleteCompany);

// Address sub-routes
router.post('/:id/addresses', verifyToken, controller.addAddress);
router.delete('/addresses/:addressId', verifyToken, controller.deleteAddress);

module.exports = router;
