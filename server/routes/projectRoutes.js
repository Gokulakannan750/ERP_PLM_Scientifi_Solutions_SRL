const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyAnyPermission, verifyPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');

const canView = verifyAnyPermission([PERMISSIONS.MANAGE_PROJECTS, PERMISSIONS.VIEW_PROJECTS]);
const canManage = verifyPermission(PERMISSIONS.MANAGE_PROJECTS);

// ─── Projects ───
router.get('/', canView, projectController.getProjects);
router.post('/', canManage, projectController.createProject);
router.get('/:id', canView, projectController.getProjectById);
router.put('/:id', canManage, projectController.updateProject);
router.delete('/:id', canManage, projectController.deleteProject);

// ─── Team Members ───
router.post('/:projectId/team', canManage, projectController.addTeamMember);
router.delete('/:projectId/team/:memberId', canManage, projectController.removeTeamMember);

// ─── Milestones ───
router.post('/:projectId/milestones', canManage, projectController.createMilestone);
router.put('/:projectId/milestones/:id', canManage, projectController.updateMilestone);

// ─── Tasks ───
router.post('/:projectId/tasks', canManage, projectController.createTask);
router.put('/:projectId/tasks/:id', canManage, projectController.updateTask);

// ─── Task Comments ───
router.post('/:projectId/tasks/:taskId/comments', canView, projectController.addTaskComment);
router.get('/:projectId/tasks/:taskId/comments', canView, projectController.getTaskComments);

// ─── Timesheets ───
router.post('/:projectId/tasks/:taskId/timesheets', canView, projectController.addTimesheetEntry);
router.get('/:projectId/tasks/:taskId/timesheets', canView, projectController.getTaskTimesheets);

// ─── Documents ───
router.post('/:projectId/documents', canManage, projectController.upload.single('file'), projectController.uploadDocument);

module.exports = router;
