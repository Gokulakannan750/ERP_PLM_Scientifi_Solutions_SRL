const prisma = require('../prismaClient');

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      include: { subcategories: { orderBy: { code: 'asc' } } },
      orderBy: { code: 'asc' }
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
    const category = await prisma.productCategory.create({
      data: { code: code.toUpperCase().slice(0, 2), name },
      include: { subcategories: true }
    });
    res.json(category);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category code already exists' });
    res.status(500).json({ error: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await prisma.productCategory.update({
      where: { id: parseInt(id) },
      data: { name },
      include: { subcategories: true }
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.productCategory.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createSubcategory = async (req, res) => {
  try {
    const { id } = req.params; // categoryId
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
    const sub = await prisma.productSubcategory.create({
      data: { code: code.toUpperCase().slice(0, 2), name, categoryId: parseInt(id) }
    });
    res.json(sub);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Subcategory code already exists in this category' });
    res.status(500).json({ error: err.message });
  }
};

const deleteSubcategory = async (req, res) => {
  try {
    const { subId } = req.params;
    await prisma.productSubcategory.delete({ where: { id: parseInt(subId) } });
    res.json({ message: 'Subcategory deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, createSubcategory, deleteSubcategory };
