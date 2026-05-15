const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { badRequest, conflict, serverError } = require('../utils/errorResponse');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { user_id: user.id, email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "4h" }
            );
            logger.info('Successful login', { userId: user.id, email: user.email });
            return res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
        }
        logger.warn('Failed login attempt', { email });
        return badRequest(res, 'Invalid email or password');
    } catch (err) {
        logger.error('Login error', { error: err.message });
        return serverError(res, 'Login failed');
    }
};

const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const oldUser = await prisma.user.findUnique({ where: { email } });

        if (oldUser) {
            return conflict(res, 'An account with this email already exists');
        }

        const encryptedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: encryptedPassword,
                role: role || 'SUB_ADMIN',
            },
        });

        const token = jwt.sign(
            { user_id: user.id, email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        logger.info('New user registered', { userId: user.id, email: user.email, role: user.role });
        res.status(201).json({ id: user.id, email: user.email, role: user.role, token });
    } catch (err) {
        logger.error('Registration error', { error: err.message, email: req.body.email });
        return serverError(res, 'Registration failed');
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name } = req.body;
        if (!name || !name.trim()) return badRequest(res, 'Name is required');

        const user = await prisma.user.update({
            where: { id: userId },
            data: { name: name.trim() },
            select: { id: true, email: true, name: true, role: true }
        });

        logger.info('Profile updated', { userId });
        res.json(user);
    } catch (err) {
        logger.error('Profile update error', { error: err.message });
        return serverError(res, 'Failed to update profile');
    }
};

module.exports = { login, register, updateProfile };
