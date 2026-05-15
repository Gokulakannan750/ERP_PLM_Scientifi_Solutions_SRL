const prisma = require('../prismaClient');
const path   = require('path');
const fs     = require('fs');

const userSelect = { id: true, name: true, email: true };

// ── List ──────────────────────────────────────────────────────────────────────
const getExpenses = async (req, res) => {
    try {
        const { expenseType, status, submittedById, from, to } = req.query;
        const where = {};
        if (expenseType)    where.expenseType    = expenseType;
        if (status)         where.status         = status;
        if (submittedById)  where.submittedById  = parseInt(submittedById);
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to)   where.date.lte = new Date(to);
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: {
                submittedBy: { select: userSelect },
                approvedBy:  { select: userSelect },
            },
            orderBy: { date: 'desc' },
        });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Single ────────────────────────────────────────────────────────────────────
const getExpense = async (req, res) => {
    try {
        const expense = await prisma.expense.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                submittedBy: { select: userSelect },
                approvedBy:  { select: userSelect },
            },
        });
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        res.json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Create ────────────────────────────────────────────────────────────────────
const createExpense = async (req, res) => {
    try {
        const {
            expenseType, category, description, amount, currency, date,
            destination, purpose, departureDate, returnDate, notes,
        } = req.body;

        if (!expenseType || !description || !amount || !date) {
            return res.status(400).json({ error: 'expenseType, description, amount, and date are required' });
        }

        const data = {
            expenseType,
            category:    category    || null,
            description,
            amount:      parseFloat(amount),
            currency:    currency    || 'EUR',
            date:        new Date(date),
            notes:       notes       || null,
            submittedById: req.user.id,
        };

        if (expenseType === 'TRAVEL') {
            data.destination  = destination  || null;
            data.purpose      = purpose      || null;
            data.departureDate = departureDate ? new Date(departureDate) : null;
            data.returnDate    = returnDate   ? new Date(returnDate)    : null;
        }

        if (req.file) {
            data.receiptFileName = req.file.originalname;
            data.receiptUrl      = `/uploads/expenses/${req.file.filename}`;
        }

        const expense = await prisma.expense.create({
            data,
            include: {
                submittedBy: { select: userSelect },
                approvedBy:  { select: userSelect },
            },
        });
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Update ────────────────────────────────────────────────────────────────────
const updateExpense = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Expense not found' });

        // Only the submitter or admin can edit; can only edit when PENDING
        const isAdmin = req.user.role === 'ADMIN';
        if (!isAdmin && existing.submittedById !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (existing.status !== 'PENDING' && !isAdmin) {
            return res.status(400).json({ error: 'Only PENDING expenses can be edited' });
        }

        const {
            category, description, amount, currency, date,
            destination, purpose, departureDate, returnDate, notes,
        } = req.body;

        const data = {};
        if (category    !== undefined) data.category    = category;
        if (description !== undefined) data.description = description;
        if (amount      !== undefined) data.amount      = parseFloat(amount);
        if (currency    !== undefined) data.currency    = currency;
        if (date        !== undefined) data.date        = new Date(date);
        if (notes       !== undefined) data.notes       = notes;
        if (destination !== undefined) data.destination = destination;
        if (purpose     !== undefined) data.purpose     = purpose;
        if (departureDate !== undefined) data.departureDate = departureDate ? new Date(departureDate) : null;
        if (returnDate    !== undefined) data.returnDate    = returnDate    ? new Date(returnDate)    : null;

        if (req.file) {
            // Remove old receipt
            if (existing.receiptUrl) {
                const oldPath = path.join(__dirname, '..', existing.receiptUrl);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            data.receiptFileName = req.file.originalname;
            data.receiptUrl      = `/uploads/expenses/${req.file.filename}`;
        }

        const updated = await prisma.expense.update({
            where: { id },
            data,
            include: {
                submittedBy: { select: userSelect },
                approvedBy:  { select: userSelect },
            },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Status transition ─────────────────────────────────────────────────────────
const updateStatus = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;

        const VALID = ['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED'];
        if (!VALID.includes(status)) {
            return res.status(400).json({ error: `status must be one of ${VALID.join(', ')}` });
        }

        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Expense not found' });

        const data = { status };
        if (status === 'APPROVED' || status === 'REJECTED') {
            data.approvedById = req.user.id;
        }

        const updated = await prisma.expense.update({
            where: { id },
            data,
            include: {
                submittedBy: { select: userSelect },
                approvedBy:  { select: userSelect },
            },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteExpense = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Expense not found' });

        if (existing.receiptUrl) {
            const filePath = path.join(__dirname, '..', existing.receiptUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await prisma.expense.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Summary (petty cash balance + travel pending reimbursement) ───────────────
const getSummary = async (req, res) => {
    try {
        const { year, month } = req.query;

        // Build optional date filter for the requested month
        let dateFilter = {};
        if (year && month) {
            const start = new Date(parseInt(year), parseInt(month) - 1, 1);
            const end   = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
            dateFilter = { gte: start, lte: end };
        }

        // Petty cash: total approved spend this month
        const pettyCashRows = await prisma.expense.findMany({
            where: {
                expenseType: 'PETTY_CASH',
                status: { in: ['APPROVED'] },
                ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
            },
            select: { amount: true },
        });
        const pettyCashTotal = pettyCashRows.reduce((s, r) => s + parseFloat(r.amount), 0);

        // Travel: pending reimbursement amount
        const travelPending = await prisma.expense.aggregate({
            where: { expenseType: 'TRAVEL', status: 'APPROVED' },
            _sum: { amount: true },
        });

        // Travel: reimbursed this month
        const travelReimbursed = await prisma.expense.aggregate({
            where: {
                expenseType: 'TRAVEL',
                status: 'REIMBURSED',
                ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
            },
            _sum: { amount: true },
        });

        // Monthly breakdown for petty cash (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyExpenses = await prisma.expense.findMany({
            where: {
                expenseType: 'PETTY_CASH',
                status: 'APPROVED',
                date: { gte: sixMonthsAgo },
            },
            select: { amount: true, date: true },
        });

        // Group by month
        const monthlyMap = {};
        for (const row of monthlyExpenses) {
            const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[key] = (monthlyMap[key] || 0) + parseFloat(row.amount);
        }
        const monthlyBreakdown = Object.entries(monthlyMap)
            .map(([month, total]) => ({ month, total }))
            .sort((a, b) => a.month.localeCompare(b.month));

        res.json({
            pettyCash: {
                approvedThisPeriod: pettyCashTotal,
                monthlyBreakdown,
            },
            travel: {
                pendingReimbursement: parseFloat(travelPending._sum.amount || 0),
                reimbursedThisPeriod: parseFloat(travelReimbursed._sum.amount || 0),
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    updateStatus,
    deleteExpense,
    getSummary,
};
