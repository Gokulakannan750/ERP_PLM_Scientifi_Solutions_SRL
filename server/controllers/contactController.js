const prisma = require('../prismaClient');

// Get all contacts (people)
const getContacts = async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({
            include: { company: true, address: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getContact = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await prisma.contact.findUnique({
            where: { id: parseInt(id) },
            include: { company: true, address: true }
        });
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        res.json(contact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createContact = async (req, res) => {
    try {
        const { name, email, phone, jobTitle, companyId, addressId } = req.body;

        // Ensure companyId is present
        if (!companyId) return res.status(400).json({ error: 'Company is required' });

        const contact = await prisma.contact.create({
            data: {
                name,
                email,
                phone,
                jobTitle,
                companyId: parseInt(companyId),
                addressId: addressId ? parseInt(addressId) : null
            },
            include: { company: true, address: true }
        });
        res.json(contact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, jobTitle, companyId, addressId } = req.body;
        const contact = await prisma.contact.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                phone,
                jobTitle,
                companyId: companyId ? parseInt(companyId) : undefined,
                addressId: addressId ? parseInt(addressId) : null
            },
            include: { company: true, address: true }
        });
        res.json(contact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contact.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Contact deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getContacts, getContact, createContact, updateContact, deleteContact };
