const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, controller.getProjects);
router.get('/:id', verifyToken, controller.getProject);
router.post('/', verifyToken, controller.createProject);
router.put('/:id', verifyToken, controller.updateProject);
router.delete('/:id', verifyToken, controller.deleteProject);

module.exports = router;
