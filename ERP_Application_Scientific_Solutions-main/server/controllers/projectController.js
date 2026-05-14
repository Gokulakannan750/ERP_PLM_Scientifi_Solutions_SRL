const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for project documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/projects');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const ALLOWED_PROJECT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.txt', '.csv', '.zip', '.rar', '.7z',
  '.prt', '.asm', '.drw', '.stp', '.step', '.dxf', '.dwg', '.stl',
];
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_PROJECT_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${ext}' is not allowed for project documents`));
    }
  },
});

// ─── Projects ─────────────────────────────────────────────────

const getProjects = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const userId  = req.user?.userId;

    // Non-admin users see only public projects or projects they are a team member of
    const where = isAdmin ? {} : {
      OR: [
        { isPublic: true },
        { teamMembers: { some: { userId } } },
      ],
    };

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        teamMembers: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: { select: { id: true, status: true, estimatedHours: true, actualHours: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        teamMembers: { include: { user: { select: { id: true, name: true, email: true } } } },
        milestones: { include: { tasks: true } },
        tasks: { 
            include: { 
                owner: { select: { id: true, name: true, email: true } },
                milestone: true,
                dependenciesAsPredecessor: true,
                dependenciesAsSuccessor: true
            } 
        },
        documents: { include: { uploadedBy: { select: { id: true, name: true } } } },
        invoices: { select: { id: true, invoiceNumber: true, totalAmount: true, status: true, date: true } }
      }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const linkedInvoiceTotal = project.invoices.reduce((s, inv) => s + parseFloat(inv.totalAmount), 0);
    res.json({ ...project, linkedInvoiceTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, description, category, tags, priorityLevel, budget, status, startDate, endDate, clientId } = req.body;
    const project = await prisma.project.create({
      data: {
        name,
        description,
        category,
        tags,
        priorityLevel: priorityLevel || 'MEDIUM',
        budget: budget ? parseFloat(budget) : null,
        status: status || 'PLANNING',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        clientId: clientId ? parseInt(clientId) : null
      }
    });
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create project' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, tags, priorityLevel, budget, status, startDate, endDate, clientId } = req.body;
    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        category,
        tags,
        priorityLevel,
        budget: budget ? parseFloat(budget) : null,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        clientId: clientId ? parseInt(clientId) : null
      }
    });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

// ─── Team Members ─────────────────────────────────────────────

const addTeamMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;
    const teamMember = await prisma.projectTeamMember.create({
      data: {
        projectId: parseInt(projectId),
        userId: parseInt(userId),
        role: role || 'MEMBER'
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(teamMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add team member' });
  }
};

const removeTeamMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    await prisma.projectTeamMember.delete({
      where: { id: parseInt(memberId) }
    });
    res.json({ message: 'Team member removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to remove team member' });
  }
};

// ─── Milestones ───────────────────────────────────────────────

const createMilestone = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, targetDate, isReached } = req.body;
    const milestone = await prisma.milestone.create({
      data: {
        projectId: parseInt(projectId),
        name,
        targetDate: targetDate ? new Date(targetDate) : null,
        isReached: isReached || false
      }
    });
    res.status(201).json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create milestone' });
  }
};

const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetDate, isReached } = req.body;
    const milestone = await prisma.milestone.update({
      where: { id: parseInt(id) },
      data: {
        name,
        targetDate: targetDate ? new Date(targetDate) : null,
        isReached
      }
    });
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update milestone' });
  }
};

// ─── Tasks ────────────────────────────────────────────────────

const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, milestoneId, ownerId, startDate, dueDate, priority, status, estimatedHours } = req.body;
    
    const task = await prisma.task.create({
      data: {
        projectId: parseInt(projectId),
        title,
        description,
        milestoneId: milestoneId ? parseInt(milestoneId) : null,
        ownerId: ownerId ? parseInt(ownerId) : null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        status: status || 'OPEN',
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null
      },
      include: {
          owner: { select: { id: true, name: true, email: true } },
          milestone: true
      }
    });
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create task' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, milestoneId, ownerId, startDate, dueDate, priority, status, estimatedHours } = req.body;
    
    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        milestoneId: milestoneId ? parseInt(milestoneId) : null,
        ownerId: ownerId ? parseInt(ownerId) : null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null
      },
      include: {
          owner: { select: { id: true, name: true, email: true } },
          milestone: true
      }
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

// ─── Task Comments ────────────────────────────────────────────

const addTaskComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;
    if (!content?.trim()) return res.status(400).json({ message: 'Comment content is required' });
    const comment = await prisma.taskComment.create({
      data: { taskId: parseInt(taskId), userId, content: content.trim() },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await prisma.taskComment.findMany({
      where: { taskId: parseInt(taskId) },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get comments' });
  }
};

// ─── Timesheets ───────────────────────────────────────────────

const addTimesheetEntry = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { date, hours, notes } = req.body;
    const userId = req.user.userId;

    // Use transaction to ensure both entry is created and task is updated
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.timesheetEntry.create({
        data: {
          taskId: parseInt(taskId),
          userId: parseInt(userId),
          date: new Date(date),
          hours: parseFloat(hours),
          notes
        }
      });

      const task = await tx.task.findUnique({ where: { id: parseInt(taskId) } });
      const newActualHours = (parseFloat(task.actualHours || 0) + parseFloat(hours)).toFixed(2);

      await tx.task.update({
        where: { id: parseInt(taskId) },
        data: { actualHours: parseFloat(newActualHours) }
      });

      return entry;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add timesheet entry' });
  }
};

const getTaskTimesheets = async (req, res) => {
    try {
        const { taskId } = req.params;
        const timesheets = await prisma.timesheetEntry.findMany({
            where: { taskId: parseInt(taskId) },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { date: 'desc' }
        });
        res.json(timesheets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to get timesheets' });
    }
}

// ─── Documents ────────────────────────────────────────────────

const uploadDocument = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const document = await prisma.projectDocument.create({
      data: {
        projectId: parseInt(projectId),
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        fileUrl: `/uploads/projects/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedByUserId: req.user.userId
      },
      include: { uploadedBy: { select: { id: true, name: true } } }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
};

module.exports = {
  upload,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  addTaskComment,
  getTaskComments,
  removeTeamMember,
  createMilestone,
  updateMilestone,
  createTask,
  updateTask,
  addTimesheetEntry,
  getTaskTimesheets,
  uploadDocument
};
