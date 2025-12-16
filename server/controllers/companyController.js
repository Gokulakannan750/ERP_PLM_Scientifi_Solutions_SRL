const prisma = require('../prismaClient');

// Get all companies with their addresses and category
const getCompanies = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            include: { category: true, addresses: true, contacts: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(companies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single company details
const getCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await prisma.company.findUnique({
            where: { id: parseInt(id) },
            include: { category: true, addresses: true, contacts: true }
        });
        if (!company) return res.status(404).json({ error: 'Company not found' });
        res.json(company);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createCompany = async (req, res) => {
    try {
        const { name, website, email, phone, categoryId, address } = req.body;
        // Transaction to create Company AND initial Address if provided
        const newCompany = await prisma.company.create({
            data: {
                name,
                website,
                email,
                phone,
                categoryId: categoryId ? parseInt(categoryId) : null,
                // If address provided, create it inline
                addresses: address ? {
                    create: {
                        street: address.street,
                        city: address.city,
                        state: address.state,
                        pincode: address.pincode,
                        country: address.country
                    }
                } : undefined
            },
            include: { addresses: true, category: true }
        });
        res.json(newCompany);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, website, email, phone, categoryId } = req.body;
        const company = await prisma.company.update({
            where: { id: parseInt(id) },
            data: {
                name,
                website,
                email,
                phone,
                categoryId: categoryId ? parseInt(categoryId) : null,
            },
            include: { category: true, addresses: true }
        });
        res.json(company);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.company.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Company deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Add Address to existing Company
const addAddress = async (req, res) => {
    try {
        const { id } = req.params; // Company ID
        const { street, city, state, pincode, country } = req.body;
        const address = await prisma.address.create({
            data: {
                companyId: parseInt(id),
                street, city, state, pincode, country
            }
        });
        res.json(address);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        await prisma.address.delete({ where: { id: parseInt(addressId) } });
        res.json({ message: 'Address deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getCompanies, getCompany, createCompany, updateCompany, deleteCompany, addAddress, deleteAddress };
