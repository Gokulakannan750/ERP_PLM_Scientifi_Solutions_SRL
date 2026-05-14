const prisma = require('../prismaClient');

// Get all contacts (non-obsolete by default)
const getContacts = async (req, res) => {
  try {
    const { showObsolete } = req.query;
    const contacts = await prisma.contact.findMany({
      where: showObsolete === 'true' ? {} : { isObsolete: false },
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
      include: {
        company: {
          include: {
            invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
            offers: { orderBy: { createdAt: 'desc' }, take: 10 }
          }
        },
        address: true
      }
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createContact = async (req, res) => {
  try {
    const {
      name, firstName, surname,
      email, pecEmail,
      phone, cellPhone,
      jobTitle,
      notes, quickNotes,
      companyId, addressId
    } = req.body;

    if (!companyId) return res.status(400).json({ error: 'Company is required' });

    // Derive display name: prefer firstName + surname if provided
    const displayName = (firstName && surname)
      ? `${firstName} ${surname}`
      : (name || firstName || surname || '');

    const contact = await prisma.contact.create({
      data: {
        name: displayName,
        firstName: firstName || null,
        surname: surname || null,
        email: email || null,
        pecEmail: pecEmail || null,
        phone: phone || null,
        cellPhone: cellPhone || null,
        jobTitle: jobTitle || null,
        notes: notes || null,
        quickNotes: quickNotes || null,
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
    const {
      name, firstName, surname,
      email, pecEmail,
      phone, cellPhone,
      jobTitle,
      notes, quickNotes,
      companyId, addressId
    } = req.body;

    // Derive display name
    const displayName = (firstName && surname)
      ? `${firstName} ${surname}`
      : (name || undefined);

    const contact = await prisma.contact.update({
      where: { id: parseInt(id) },
      data: {
        name: displayName,
        firstName: firstName !== undefined ? firstName : undefined,
        surname: surname !== undefined ? surname : undefined,
        email: email !== undefined ? email : undefined,
        pecEmail: pecEmail !== undefined ? pecEmail : undefined,
        phone: phone !== undefined ? phone : undefined,
        cellPhone: cellPhone !== undefined ? cellPhone : undefined,
        jobTitle: jobTitle !== undefined ? jobTitle : undefined,
        notes: notes !== undefined ? notes : undefined,
        quickNotes: quickNotes !== undefined ? quickNotes : undefined,
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

// Soft delete — mark as obsolete
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contact.update({
      where: { id: parseInt(id) },
      data: { isObsolete: true }
    });
    res.json({ message: 'Contact marked as obsolete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getContacts, getContact, createContact, updateContact, deleteContact };
