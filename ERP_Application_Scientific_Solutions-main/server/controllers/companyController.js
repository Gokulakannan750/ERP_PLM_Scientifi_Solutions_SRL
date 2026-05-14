const prisma = require('../prismaClient');
const path = require('path');
const fs = require('fs');

// Tracked fields for change logging
const TRACKED_FIELDS = ['name', 'email', 'phone', 'website', 'taxId', 'gstNumber',
  'vatPercentage', 'paymentTerms', 'incoterms', 'notes', 'isObsolete', 'categoryId'];

// Helper: log changed fields
const logChanges = async (companyId, userId, oldData, newData) => {
  const logs = [];
  for (const field of TRACKED_FIELDS) {
    const oldVal = oldData[field] !== undefined ? String(oldData[field] ?? '') : null;
    const newVal = newData[field] !== undefined ? String(newData[field] ?? '') : null;
    if (oldVal !== newVal) {
      logs.push({ companyId, userId, fieldName: field, oldValue: oldVal, newValue: newVal });
    }
  }
  if (logs.length > 0) {
    await prisma.companyChangeLog.createMany({ data: logs });
  }
};

// Get all companies with their addresses and category
const getCompanies = async (req, res) => {
  try {
    const { showObsolete } = req.query;
    const companies = await prisma.company.findMany({
      where: showObsolete === 'true' ? {} : { isObsolete: false },
      include: { category: true, addresses: true, contacts: true, bankAccounts: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single company with all related data
const getCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        addresses: true,
        contacts: { where: { isObsolete: false } },
        bankAccounts: true,
        documents: { include: { uploadedBy: { select: { id: true, email: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        changeLogs: { include: { user: { select: { id: true, email: true, name: true } } }, orderBy: { changedAt: 'desc' }, take: 50 }
      }
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCompany = async (req, res) => {
  try {
    const {
      name, website, email, phone, categoryId,
      taxId, gstNumber, vatPercentage, paymentTerms, incoterms, notes,
      address
    } = req.body;

    const newCompany = await prisma.company.create({
      data: {
        name, website, email, phone,
        taxId: taxId || null,
        gstNumber: gstNumber || null,
        vatPercentage: vatPercentage ? parseFloat(vatPercentage) : null,
        paymentTerms: paymentTerms || null,
        incoterms: incoterms || null,
        notes: notes || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        addresses: address && address.street ? {
          create: {
            type: address.type || null,
            street: address.street,
            street2: address.street2 || null,
            houseNumber: address.houseNumber || null,
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
    const {
      name, website, email, phone, categoryId,
      taxId, gstNumber, vatPercentage, paymentTerms, incoterms, notes
    } = req.body;

    const oldCompany = await prisma.company.findUnique({ where: { id: parseInt(id) } });
    if (!oldCompany) return res.status(404).json({ error: 'Company not found' });

    const updateData = {
      name, website, email, phone,
      taxId: taxId !== undefined ? taxId : oldCompany.taxId,
      gstNumber: gstNumber !== undefined ? gstNumber : oldCompany.gstNumber,
      vatPercentage: vatPercentage !== undefined ? (vatPercentage ? parseFloat(vatPercentage) : null) : oldCompany.vatPercentage,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : oldCompany.paymentTerms,
      incoterms: incoterms !== undefined ? incoterms : oldCompany.incoterms,
      notes: notes !== undefined ? notes : oldCompany.notes,
      categoryId: categoryId ? parseInt(categoryId) : null,
    };

    const company = await prisma.company.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { category: true, addresses: true }
    });

    // Log changes
    const userId = req.user?.userId || req.user?.user_id;
    if (userId) {
      await logChanges(parseInt(id), userId, oldCompany, updateData);
    }

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Soft delete — mark as obsolete
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const oldCompany = await prisma.company.findUnique({ where: { id: parseInt(id) } });
    if (!oldCompany) return res.status(404).json({ error: 'Company not found' });

    await prisma.company.update({
      where: { id: parseInt(id) },
      data: { isObsolete: true }
    });

    const userId = req.user?.userId || req.user?.user_id;
    if (userId) {
      await logChanges(parseInt(id), userId, oldCompany, { isObsolete: true });
    }

    res.json({ message: 'Company marked as obsolete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Address ──────────────────────────────────────────────────
const addAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, street, street2, houseNumber, city, state, pincode, country } = req.body;
    const address = await prisma.address.create({
      data: { companyId: parseInt(id), type, street, street2, houseNumber, city, state, pincode, country }
    });
    res.json(address);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { type, street, street2, houseNumber, city, state, pincode, country } = req.body;
    const address = await prisma.address.update({
      where: { id: parseInt(addressId) },
      data: { type, street, street2, houseNumber, city, state, pincode, country }
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
};

// ─── Bank Accounts ────────────────────────────────────────────
const getBankAccounts = async (req, res) => {
  try {
    const { id } = req.params;
    const accounts = await prisma.bankAccount.findMany({
      where: { companyId: parseInt(id) },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, accountNumber, iban, bicSwift, routingNumber, bankAddress, isDefault } = req.body;
    const companyId = parseInt(id);

    // If this is the default, remove default from others
    if (isDefault) {
      await prisma.bankAccount.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const account = await prisma.bankAccount.create({
      data: { companyId, bankName, accountNumber, iban, bicSwift, routingNumber, bankAddress, isDefault: !!isDefault }
    });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateBankAccount = async (req, res) => {
  try {
    const { id, bankId } = req.params;
    const { bankName, accountNumber, iban, bicSwift, routingNumber, bankAddress, isDefault } = req.body;
    const companyId = parseInt(id);

    if (isDefault) {
      await prisma.bankAccount.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const account = await prisma.bankAccount.update({
      where: { id: parseInt(bankId) },
      data: { bankName, accountNumber, iban, bicSwift, routingNumber, bankAddress, isDefault: !!isDefault }
    });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteBankAccount = async (req, res) => {
  try {
    const { bankId } = req.params;
    await prisma.bankAccount.delete({ where: { id: parseInt(bankId) } });
    res.json({ message: 'Bank account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Documents ────────────────────────────────────────────────
const getDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const docs = await prisma.companyDocument.findMany({
      where: { companyId: parseInt(id) },
      include: { uploadedBy: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);
    const userId = req.user?.userId || req.user?.user_id;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const doc = await prisma.companyDocument.create({
      data: {
        companyId,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        fileUrl: `/uploads/companies/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        version: 1,
        uploadedByUserId: userId
      },
      include: { uploadedBy: { select: { id: true, email: true, name: true } } }
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const doc = await prisma.companyDocument.findUnique({ where: { id: parseInt(docId) } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Remove the file from disk
    const filePath = path.join(__dirname, '..', 'uploads', 'companies', doc.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.companyDocument.delete({ where: { id: parseInt(docId) } });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Change Log ───────────────────────────────────────────────
const getChangeLog = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await prisma.companyChangeLog.findMany({
      where: { companyId: parseInt(id) },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { changedAt: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Linked Records ───────────────────────────────────────────
const getLinkedInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    const invoices = await prisma.invoice.findMany({
      where: { companyId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLinkedOffers = async (req, res) => {
  try {
    const { id } = req.params;
    const offers = await prisma.offer.findMany({
      where: { companyId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCompanies, getCompany, createCompany, updateCompany, deleteCompany,
  addAddress, updateAddress, deleteAddress,
  getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount,
  getDocuments, uploadDocument, deleteDocument,
  getChangeLog,
  getLinkedInvoices, getLinkedOffers
};
