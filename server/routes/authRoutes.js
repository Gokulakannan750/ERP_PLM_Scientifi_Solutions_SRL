const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { loginSchema, createUserSchema } = require('../validators/schemas');

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(createUserSchema), authController.register); // Keep openly accessible for initial setup, or protect later

module.exports = router;
