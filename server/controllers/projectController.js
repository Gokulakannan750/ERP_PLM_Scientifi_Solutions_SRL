const prisma = require('../prismaClient');

const getProjects = async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            include: { client: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({
            where: { id: parseInt(id) },
            include: { client: true }
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createProject = async (req, res) => {
    try {
        const { name, description, budget, status, startDate, endDate, clientId, cadFilePath } = req.body;
        const project = await prisma.project.create({
            data: {
                name,
                description,
                budget: budget ? parseFloat(budget) : null,
                status: status || 'active',
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                clientId: clientId ? parseInt(clientId) : null,
                cadFilePath
            },
            include: { client: true }
        });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, budget, status, startDate, endDate, clientId, cadFilePath } = req.body;
        const project = await prisma.project.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                budget: budget ? parseFloat(budget) : null,
                status: status,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                clientId: clientId ? parseInt(clientId) : null,
                cadFilePath
            },
            include: { client: true }
        });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.project.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject };
