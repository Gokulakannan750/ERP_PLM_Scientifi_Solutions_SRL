const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { loginSchema, createUserSchema } = require('../validators/schemas');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(createUserSchema), authController.register);
router.put('/profile', verifyToken, authController.updateProfile);

module.exports = router;
