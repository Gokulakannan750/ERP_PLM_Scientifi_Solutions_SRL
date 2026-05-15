const express = require('express');
const router = express.Router();
const plmController = require('../controllers/plmController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes protected by JWT
router.use(verifyToken);

// ─── Item CRUD ────────────────────────────────────────────────────────────────
router.get('/items',               plmController.listPlmItems);
router.post('/items',              plmController.createPlmItem);
router.post('/items/:id/revise',   plmController.reviseItem);
router.patch('/items/:id',         plmController.updatePlmItem);
router.patch('/items/:id/state',   plmController.transitionState);

// ─── Personal Workspace ───────────────────────────────────────────────────────
router.get('/workspace',                   plmController.getMyWorkspace);
router.post('/items/:id/checkout',         plmController.checkoutItem);
router.post('/items/:id/checkin',          plmController.checkinItem);
router.post('/items/:id/undo-checkout',    plmController.undoCheckout);

// ─── BOM ──────────────────────────────────────────────────────────────────────
router.get('/items/:id/bom',          plmController.getBom);
router.post('/items/:id/bom',         plmController.updateBom);
router.get('/items/:id/bom/tree',     plmController.getBomTree);
router.get('/items/:id/bom/export',   plmController.exportBomCsv);

// ─── Audit Log ────────────────────────────────────────────────────────────────
router.get('/items/:id/audit', plmController.getAuditLog);

// ─── File Attachments ─────────────────────────────────────────────────────────
router.get('/items/:id/files',            plmController.listFiles);
router.post('/items/:id/files',           plmController.upload.single('file'), plmController.uploadFile);
router.post('/items/:id/files/import',    plmController.importLocalFile);
router.delete('/items/:id/files/:fileId', plmController.deleteFile);

// ─── Templates (admin) ────────────────────────────────────────────────────────
router.get('/templates',         plmController.listTemplates);
router.post('/templates',        plmController.createTemplate);
router.put('/templates/:id',     plmController.updateTemplate);
router.delete('/templates/:id',  plmController.deleteTemplate);

// ─── Material Library ─────────────────────────────────────────────────────────
router.get('/materials',           plmController.listMaterials);
router.post('/materials',          plmController.createMaterial);
router.put('/materials/:id',       plmController.updateMaterial);
router.delete('/materials/:id',    plmController.deleteMaterial);
router.patch('/items/:id/material', plmController.assignMaterial);

module.exports = router;
