const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply authentication middleware
router.use(verifyToken);

// ─── Projects ───
router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// ─── Team Members ───
router.post('/:projectId/team', projectController.addTeamMember);
router.delete('/:projectId/team/:memberId', projectController.removeTeamMember);

// ─── Milestones ───
router.post('/:projectId/milestones', projectController.createMilestone);
router.put('/:projectId/milestones/:id', projectController.updateMilestone);

// ─── Tasks ───
router.post('/:projectId/tasks', projectController.createTask);
router.put('/:projectId/tasks/:id', projectController.updateTask);

// ─── Task Comments ───
router.post('/:projectId/tasks/:taskId/comments', projectController.addTaskComment);
router.get('/:projectId/tasks/:taskId/comments', projectController.getTaskComments);

// ─── Timesheets ───
router.post('/:projectId/tasks/:taskId/timesheets', projectController.addTimesheetEntry);
router.get('/:projectId/tasks/:taskId/timesheets', projectController.getTaskTimesheets);

// ─── Documents ───
router.post('/:projectId/documents', projectController.upload.single('file'), projectController.uploadDocument);

module.exports = router;
