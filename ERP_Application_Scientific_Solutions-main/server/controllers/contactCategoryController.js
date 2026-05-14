const prisma = require('../prismaClient');

const getCategories = async (req, res) => {
    try {
        const categories = await prisma.contactCategory.findMany();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.contactCategory.create({
            data: { name, description },
        });
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const category = await prisma.contactCategory.update({
            where: { id: parseInt(id) },
            data: { name, description },
        });
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contactCategory.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
