const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { verifyToken, verifyPermission, verifyAnyPermission } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createOfferSchema } = require('../validators/schemas');
const PERMISSIONS = require('../constants/permissions');

router.post('/', verifyPermission(PERMISSIONS.CREATE_OFFERS), validate(createOfferSchema), offerController.createOffer);
router.get('/', verifyPermission(PERMISSIONS.VIEW_OFFER_HISTORY), offerController.getOffers);
router.get('/:id', verifyPermission(PERMISSIONS.VIEW_OFFER_HISTORY), offerController.getOffer);
router.put('/:id/status', verifyPermission(PERMISSIONS.EDIT_OFFERS), offerController.updateStatus);

module.exports = router;
