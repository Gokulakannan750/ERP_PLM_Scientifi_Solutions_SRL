const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, offerController.createOffer);
router.get('/', verifyToken, offerController.getOffers);
router.get('/:id', verifyToken, offerController.getOffer);
router.put('/:id/status', verifyToken, offerController.updateStatus);

module.exports = router;
