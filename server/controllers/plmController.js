const prisma = require('../prismaClient');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ─── Multer — PLM file uploads ────────────────────────────────────────────────
const plmStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/plm');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
        cb(null, `${unique}-${file.originalname}`);
    },
});
const ALLOWED_PLM_EXTENSIONS = [
    '.prt', '.asm', '.drw', '.stp', '.step', '.igs', '.iges',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.png', '.jpg', '.jpeg', '.dxf', '.dwg', '.stl', '.3mf', '.txt', '.csv',
];
const upload = multer({
    storage: plmStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_PLM_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type '${ext}' is not allowed for PLM attachments`));
        }
    },
});

// ─── PLM Numbering ────────────────────────────────────────────────────────────
const generatePlmNumber = async (type, parentItem = null) => {
    // Advanced Drawing Numbering: DaaaaAL / DaaaaaLMN
    if (type === 'D' && parentItem) {
        const existingCount = await prisma.product.count({
            where: { parentId: parentItem.id, plmType: 'D' }
        });
        const drawingSequence = String.fromCharCode('L'.charCodeAt(0) + existingCount); // L, M, N...
        const sequence = parentItem.itemNumber;
        const parentRevision = parentItem.revision;
        const sku = `D${sequence}${parentRevision}${drawingSequence}`;
        return { sku, sequence, revision: drawingSequence };
    }

    const counter = await prisma.plmCounter.update({
        where: { id: 1 },
        data: { lastNumber: { increment: 1 } }
    });
    const sequence = String(counter.lastNumber).padStart(5, '0');
    const revision = 'A';
    const sku = `${type}${sequence}${revision}`;
    return { sku, sequence, revision };
};

// ─── Item helpers ─────────────────────────────────────────────────────────────
const PLM_INCLUDE = {
    checkedOutBy: { select: { id: true, name: true, email: true } },
    modifiedBy:   { select: { id: true, name: true, email: true } },
    supplier:     { select: { id: true, name: true } },
    material:     true,
};

// ─── Audit helper ─────────────────────────────────────────────────────────────
const audit = (productId, userId, action, opts = {}) =>
    prisma.plmAuditLog.create({
        data: {
            productId,
            userId,
            action,
            fromState: opts.fromState || null,
            toState:   opts.toState   || null,
            note:      opts.note      || null,
        }
    }).catch(e => console.error('Audit log error:', e)); // non-blocking



// ─── List PLM Items (dedicated endpoint) ─────────────────────────────────────
const listPlmItems = async (req, res) => {
    try {
        const { search, lifecycleState, plmType, ownerId, revision, materialId, page = 1, limit = 50 } = req.query;
        const where = { isObsolete: false };
        if (lifecycleState) where.lifecycleState = lifecycleState;
        if (plmType)        where.plmType = plmType;
        if (ownerId)        where.checkedOutByUserId = parseInt(ownerId); // Filter by owner
        if (revision)       where.revision = revision;
        if (materialId)     where.materialId = parseInt(materialId);
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku:  { contains: search } },
                { description: { contains: search } },
            ];
        }

        const [items, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: PLM_INCLUDE,
                orderBy: { updatedAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            prisma.product.count({ where }),
        ]);

        res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('PLM List Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ─── Create PLM Item ──────────────────────────────────────────────────────────
const createPlmItem = async (req, res) => {
    try {
        const { name, description, plmType, parentId, price } = req.body;

        if (!['P', 'A', 'C', 'D'].includes(plmType)) {
            return res.status(400).json({ error: 'Invalid PLM Type. Must be P, A, C, or D.' });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Item name is required.' });
        }

        let parentItem = null;
        if (parentId) {
            parentItem = await prisma.product.findUnique({ where: { id: parseInt(parentId) } });
            if (!parentItem) return res.status(400).json({ error: 'Parent item not found.' });
        }

        const { sku, sequence, revision } = await generatePlmNumber(plmType, parentItem);

        // Fetch active template for this type (if any)
        let template = null;
        let templateFileCopy = null;
        try {
            template = await prisma.plmTemplate.findFirst({
                where: { itemType: plmType, isActive: true }
            });
            // If the template has a server-side file path, copy it to uploads/plm/ with the new SKU name
            if (template?.filePath && fs.existsSync(template.filePath)) {
                const ext = path.extname(template.filePath);
                const destName = `${sku}${ext}`;
                const destPath = path.join(__dirname, '../../uploads/plm', destName);
                fs.copyFileSync(template.filePath, destPath);
                templateFileCopy = `/uploads/plm/${destName}`;
            }
        } catch (_) { /* template is optional */ }

        const item = await prisma.product.create({
            data: {
                name:             name.trim(),
                description:      description?.trim() || null,
                sku,
                plmType,
                itemNumber:       sequence,
                revision,
                price:            parseFloat(price || 0),
                lifecycleState:   'IN_WORK',
                isLocked:         false,
                parentId:         parentId ? parseInt(parentId) : null,
                modifiedByUserId: req.user.userId,
                isLatest:         true,
            },
            include: PLM_INCLUDE,
        });

        audit(item.id, req.user.userId, 'CREATED', { toState: 'IN_WORK', note: `Created ${sku}` });
        res.status(201).json({ item, template, templateFileCopy });
    } catch (error) {
        console.error('PLM Create Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ─── Revise Item (create next alpha revision) ─────────────────────────────────
const reviseItem = async (req, res) => {
    try {
        const { id } = req.params;
        const currentItem = await prisma.product.findUnique({ where: { id: parseInt(id) } });

        if (!currentItem)                                    return res.status(404).json({ error: 'Item not found' });
        if (currentItem.lifecycleState !== 'RELEASED')      return res.status(400).json({ error: 'Only Released items can be revised' });
        if (currentItem.checkedOutByUserId)                 return res.status(400).json({ error: 'Item is currently checked out' });

        const nextRevision = String.fromCharCode(currentItem.revision.charCodeAt(0) + 1);
        const newSku = `${currentItem.plmType}${currentItem.itemNumber}${nextRevision}`;

        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = currentItem;

        const newItem = await prisma.product.create({
            data: {
                ...rest,
                sku:              newSku,
                revision:         nextRevision,
                lifecycleState:   'IN_WORK',
                isLocked:         false,
                lastRecID:        currentItem.id,
                modifiedByUserId: req.user.userId,
                checkedOutByUserId: null,
                checkedOutAt:       null,
                checkoutNote:       null,
            },
            include: PLM_INCLUDE,
        });

        await prisma.product.update({ where: { id: currentItem.id }, data: { isLatest: false } });

        audit(newItem.id, req.user.userId, 'REVISED', { fromState: currentItem.revision, toState: nextRevision, note: `Revised from ${currentItem.sku} → ${newSku}` });
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Lifecycle Transition ─────────────────────────────────────────────────────
// Rules (from spec):
//   IN_WORK → UNDER_REVIEW : item owner only
//   UNDER_REVIEW → RELEASED : ADMIN only
//   ANY → OBSOLETE          : ADMIN only
const transitionState = async (req, res) => {
    try {
        const { id } = req.params;
        const { nextState } = req.body;
        const { userId, role } = req.user;
        const isAdmin = role === 'ADMIN';

        const VALID_STATES = ['IN_WORK', 'UNDER_REVIEW', 'RELEASED', 'OBSOLETE'];
        if (!VALID_STATES.includes(nextState)) {
            return res.status(400).json({ error: 'Invalid lifecycle state' });
        }

        const currentItem = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!currentItem) return res.status(404).json({ error: 'Item not found' });

        // ── Role-based guards ──────────────────────────────────────────────────
        if (nextState === 'UNDER_REVIEW') {
            // Only the item owner (last modifier) can submit for review
            if (currentItem.modifiedByUserId !== userId && !isAdmin) {
                return res.status(403).json({ error: 'Only the item owner can submit for review.' });
            }
            if (currentItem.lifecycleState !== 'IN_WORK') {
                return res.status(400).json({ error: 'Only IN_WORK items can be submitted for review.' });
            }
        }

        if (nextState === 'RELEASED') {
            if (!isAdmin) {
                return res.status(403).json({ error: 'Only an Admin or Reviewer can release an item.' });
            }
            if (currentItem.lifecycleState !== 'UNDER_REVIEW') {
                return res.status(400).json({ error: 'Only UNDER_REVIEW items can be released.' });
            }
        }

        if (nextState === 'OBSOLETE') {
            if (!isAdmin) {
                return res.status(403).json({ error: 'Only an Admin can mark an item as Obsolete.' });
            }
        }
        // ── End guards ────────────────────────────────────────────────────────

        const isLocked = ['UNDER_REVIEW', 'RELEASED', 'OBSOLETE'].includes(nextState);
        const isObsolete = nextState === 'OBSOLETE';

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                lifecycleState:   nextState,
                isLocked,
                isObsolete,
                modifiedByUserId: userId,
            },
            include: PLM_INCLUDE,
        });

        audit(parseInt(id), userId, 'STATE_TRANSITION', { fromState: currentItem.lifecycleState, toState: nextState });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Check-Out ────────────────────────────────────────────────────────────────
const checkoutItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const item = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        if (item.isLocked && item.lifecycleState !== 'IN_WORK') {
            return res.status(400).json({ error: 'Item is locked and cannot be checked out' });
        }
        if (item.checkedOutByUserId) {
            return res.status(409).json({ error: 'Item is already checked out by another user' });
        }
        if (item.lifecycleState !== 'IN_WORK') {
            return res.status(400).json({ error: 'Only IN_WORK items can be checked out' });
        }

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                checkedOutByUserId: req.user.userId,
                checkedOutAt:       new Date(),
                checkoutNote:       note?.trim() || null,
                isLocked:           true,
            },
            include: PLM_INCLUDE,
        });

        audit(parseInt(id), req.user.userId, 'CHECKOUT', { note: note?.trim() || null });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Check-In ─────────────────────────────────────────────────────────────────
const checkinItem = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        if (!item.checkedOutByUserId) {
            return res.status(400).json({ error: 'Item is not checked out' });
        }
        if (item.checkedOutByUserId !== req.user.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only the user who checked out this item (or an admin) can check it in' });
        }

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                checkedOutByUserId: null,
                checkedOutAt:       null,
                checkoutNote:       null,
                isLocked:           false,
                modifiedByUserId:   req.user.userId,
            },
            include: PLM_INCLUDE,
        });

        audit(parseInt(id), req.user.userId, 'CHECKIN');
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Undo Check-Out ────────────────────────────────────────────────────────────
const undoCheckout = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        if (!item.checkedOutByUserId) {
            return res.status(400).json({ error: 'Item is not checked out' });
        }
        if (item.checkedOutByUserId !== req.user.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only the user who checked out this item (or an admin) can undo the checkout' });
        }

        // Discard checkout — just clear the fields (no new revision created)
        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                checkedOutByUserId: null,
                checkedOutAt:       null,
                checkoutNote:       null,
                isLocked:           false,
            },
            include: PLM_INCLUDE,
        });

        audit(parseInt(id), req.user.userId, 'UNDO_CHECKOUT');
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── My Workspace ─────────────────────────────────────────────────────────────
const getMyWorkspace = async (req, res) => {
    try {
        const items = await prisma.product.findMany({
            where: { checkedOutByUserId: req.user.userId },
            include: PLM_INCLUDE,
            orderBy: { checkedOutAt: 'desc' },
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── BOM ──────────────────────────────────────────────────────────────────────
const getBom = async (req, res) => {
    try {
        const { id } = req.params;
        const bom = await prisma.bomItem.findMany({
            where: { parentId: parseInt(id) },
            include: {
                child: { include: { supplier: true, checkedOutBy: { select: { id: true, name: true } } } }
            },
            orderBy: { id: 'asc' },
        });
        res.json(bom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateBom = async (req, res) => {
    try {
        const { id } = req.params;
        const { components } = req.body; // [{ childId, quantity }]

        if (!Array.isArray(components)) {
            return res.status(400).json({ error: 'components must be an array' });
        }

        await prisma.bomItem.deleteMany({ where: { parentId: parseInt(id) } });

        if (components.length > 0) {
            await prisma.bomItem.createMany({
                data: components.map(c => ({
                    parentId: parseInt(id),
                    childId:  parseInt(c.childId),
                    quantity: parseFloat(c.quantity),
                }))
            });
        }

        const bom = await prisma.bomItem.findMany({
            where: { parentId: parseInt(id) },
            include: { child: { include: { supplier: true } } },
            orderBy: { id: 'asc' },
        });
        audit(parseInt(id), req.user.userId, 'BOM_UPDATED', { note: `${components.length} component(s)` });
        res.json(bom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Multi-level BOM tree ─────────────────────────────────────────────────────
// Recursively builds nested BOM up to 10 levels deep.
// visited set prevents infinite loops from circular assemblies.
const buildBomTree = async (parentId, depth = 0, visited = new Set()) => {
    if (depth > 10 || visited.has(parentId)) return [];
    visited.add(parentId);

    const rows = await prisma.bomItem.findMany({
        where:   { parentId },
        include: { child: { include: { supplier: { select: { id: true, name: true } }, checkedOutBy: { select: { id: true, name: true } } } } },
        orderBy: { id: 'asc' },
    });

    const result = [];
    for (const row of rows) {
        const children = await buildBomTree(row.child.id, depth + 1, new Set(visited));
        result.push({ ...row, depth, children });
    }
    return result;
};

const getBomTree = async (req, res) => {
    try {
        const tree = await buildBomTree(parseInt(req.params.id));
        res.json(tree);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── BOM CSV Export ───────────────────────────────────────────────────────────
// Flattens the tree into rows for CSV, indenting by depth using dots.
const flattenTree = (nodes, rows = []) => {
    for (const n of nodes) {
        rows.push({
            level:       n.depth,
            indent:      '.'.repeat(n.depth * 2),
            sku:         n.child.sku,
            name:        n.child.name,
            type:        n.child.plmType,
            revision:    n.child.revision,
            state:       n.child.lifecycleState,
            quantity:    n.quantity,
            unit:        'EA',
            supplier:    n.child.supplier?.name || '',
            commercial:  n.child.plmType === 'C' ? 'YES' : 'NO',
        });
        if (n.children?.length) flattenTree(n.children, rows);
    }
    return rows;
};

const exportBomCsv = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma.product.findUnique({ where: { id: parseInt(id) }, select: { sku: true, name: true } });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const tree = await buildBomTree(parseInt(id));
        const rows = flattenTree(tree);

        const header = ['Level','SKU','Name','Type','Revision','Lifecycle State','Quantity','Unit','Supplier','Commercial'];
        const csvRows = [
            header.join(','),
            ...rows.map(r => [
                r.level,
                `"${r.sku}"`,
                `"${r.name.replace(/"/g, '""')}"`,
                r.type,
                r.revision,
                r.state,
                r.quantity,
                r.unit,
                `"${r.supplier.replace(/"/g, '""')}"`,
                r.commercial,
            ].join(','))
        ];

        const csv = csvRows.join('\r\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="BOM_${item.sku}_${new Date().toISOString().slice(0,10)}.csv"`);
        res.send(csv);
    } catch (e) { res.status(500).json({ error: e.message }); }
};



// ─── Audit Log ─────────────────────────────────────────────────────────────────
const getAuditLog = async (req, res) => {
    try {
        const { id } = req.params;
        const logs = await prisma.plmAuditLog.findMany({
            where: { productId: parseInt(id) },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Templates ────────────────────────────────────────────────────────────────
const listTemplates = async (req, res) => {
    try {
        const templates = await prisma.plmTemplate.findMany({ orderBy: { itemType: 'asc' } });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createTemplate = async (req, res) => {
    try {
        const { itemType, name, filePath, fileExt, description, isActive } = req.body;
        if (!['P', 'A', 'C', 'D'].includes(itemType)) {
            return res.status(400).json({ error: 'Invalid itemType' });
        }

        // If setting as active, deactivate existing active template for this type
        if (isActive) {
            await prisma.plmTemplate.updateMany({
                where: { itemType, isActive: true },
                data:  { isActive: false }
            });
        }

        const template = await prisma.plmTemplate.create({
            data: { itemType, name, filePath, fileExt, description, isActive: !!isActive }
        });
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, filePath, fileExt, description, isActive } = req.body;

        const tpl = await prisma.plmTemplate.findUnique({ where: { id: parseInt(id) } });
        if (!tpl) return res.status(404).json({ error: 'Template not found' });

        if (isActive) {
            await prisma.plmTemplate.updateMany({
                where: { itemType: tpl.itemType, isActive: true, id: { not: parseInt(id) } },
                data:  { isActive: false }
            });
        }

        const updated = await prisma.plmTemplate.update({
            where: { id: parseInt(id) },
            data:  { name, filePath, fileExt, description, isActive: !!isActive },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.plmTemplate.delete({ where: { id: parseInt(id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── File Attachments ─────────────────────────────────────────────────────────
const listFiles = async (req, res) => {
    try {
        const files = await prisma.productDocument.findMany({
            where:   { productId: parseInt(req.params.id) },
            include: { uploadedBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(files);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const VALID_DOC_TYPES = ['GENERAL', 'SIMULATION', 'DRAWING', 'CERTIFICATE', 'DATASHEET'];

const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const productId = parseInt(req.params.id);
        const documentType = VALID_DOC_TYPES.includes(req.body.documentType)
            ? req.body.documentType
            : 'GENERAL';

        // Calculate version: count existing docs with same original name
        const existing = await prisma.productDocument.count({
            where: { productId, originalFileName: req.file.originalname },
        });

        const doc = await prisma.productDocument.create({
            data: {
                productId,
                fileName:         req.file.filename,
                originalFileName: req.file.originalname,
                fileUrl:          `/uploads/plm/${req.file.filename}`,
                fileSize:         req.file.size,
                mimeType:         req.file.mimetype,
                version:          existing + 1,
                documentType,
                uploadedByUserId: req.user.userId,
            },
            include: { uploadedBy: { select: { id: true, name: true } } },
        });

        audit(productId, req.user.userId, 'FILE_UPLOADED', { note: req.file.originalname });
        res.status(201).json(doc);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const importLocalFile = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { sourcePath } = req.body;
        if (!sourcePath || !fs.existsSync(sourcePath)) {
            return res.status(400).json({ error: 'Source file not found at path: ' + sourcePath });
        }

        const originalName = path.basename(sourcePath);
        const ext = path.extname(originalName);
        const newFileName = `import_${Date.now()}_${Math.round(Math.random()*1E9)}${ext}`;
        const destPath = path.join(__dirname, '../../uploads/plm', newFileName);

        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        const stat = fs.statSync(destPath);

        // Calculate version
        const existing = await prisma.productDocument.count({
            where: { productId, originalFileName: originalName },
        });

        const doc = await prisma.productDocument.create({
            data: {
                productId,
                fileName:         newFileName,
                originalFileName: originalName,
                fileUrl:          `/uploads/plm/${newFileName}`,
                fileSize:         stat.size,
                mimeType:         ext.toLowerCase() === '.pdf' ? 'application/pdf' : 'application/octet-stream',
                version:          existing + 1,
                uploadedByUserId: req.user.userId,
            },
            include: { uploadedBy: { select: { id: true, name: true } } },
        });

        audit(productId, req.user.userId, 'FILE_UPLOADED', { note: `Auto-imported: ${originalName}` });
        res.status(201).json(doc);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteFile = async (req, res) => {
    try {
        const { id, fileId } = req.params;
        const doc = await prisma.productDocument.findUnique({ where: { id: parseInt(fileId) } });
        if (!doc) return res.status(404).json({ error: 'File not found' });

        // Remove from disk
        const diskPath = path.join(__dirname, '../../uploads/plm', doc.fileName);
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

        await prisma.productDocument.delete({ where: { id: parseInt(fileId) } });
        audit(parseInt(id), req.user.userId, 'FILE_DELETED', { note: doc.originalFileName });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── Material Library (admin CRUD) ────────────────────────────────────────────────────────────────
const listMaterials = async (req, res) => {
    try {
        const materials = await prisma.plmMaterial.findMany({ orderBy: { name: 'asc' } });
        res.json(materials);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const createMaterial = async (req, res) => {
    try {
        const { name, colour, texture, density, standard, isActive } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Material name is required' });
        const mat = await prisma.plmMaterial.create({
            data: { name: name.trim(), colour, texture, density: density ? parseFloat(density) : null, standard, isActive: isActive !== false },
        });
        res.status(201).json(mat);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, colour, texture, density, standard, isActive } = req.body;
        const mat = await prisma.plmMaterial.update({
            where: { id: parseInt(id) },
            data:  { name, colour, texture, density: density != null ? parseFloat(density) : undefined, standard, isActive },
        });
        res.json(mat);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteMaterial = async (req, res) => {
    try {
        await prisma.plmMaterial.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Assign a material to a PLM item (or clear it)
// PATCH /plm/items/:id — update patchable fields (cadTool, plmItemLink, etc.)
const PATCHABLE_FIELDS = new Set(['cadTool', 'plmItemLink', 'description', 'checkoutNote']);
const VALID_CAD_TOOLS = new Set(['NONE', 'CREO', 'FREECAD']);

const updatePlmItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const data = {};
        for (const [key, value] of Object.entries(req.body)) {
            if (!PATCHABLE_FIELDS.has(key)) continue;
            if (key === 'cadTool' && !VALID_CAD_TOOLS.has(value)) {
                return res.status(400).json({ error: `Invalid cadTool. Must be one of: ${[...VALID_CAD_TOOLS].join(', ')}` });
            }
            data[key] = value;
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No patchable fields provided' });
        }

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data,
            include: PLM_INCLUDE,
        });

        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const assignMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { materialId } = req.body; // null to clear

        const item = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data:  { materialId: materialId ? parseInt(materialId) : null },
            include: PLM_INCLUDE,
        });

        const matName = materialId
            ? (await prisma.plmMaterial.findUnique({ where: { id: parseInt(materialId) } }))?.name
            : null;
        audit(parseInt(id), req.user.userId, 'MATERIAL_ASSIGNED', { note: matName || 'Cleared' });

        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
    upload,
    listPlmItems,
    createPlmItem,
    updatePlmItem,
    reviseItem,
    transitionState,
    checkoutItem,
    checkinItem,
    undoCheckout,
    getMyWorkspace,
    getBom,
    updateBom,
    getBomTree,
    exportBomCsv,
    getAuditLog,
    listFiles,
    uploadFile,
    importLocalFile,
    deleteFile,
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    assignMaterial,
};
