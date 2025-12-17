const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { user_id: user.id, email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "24h" }
            );
            logger.info('Successful login', { userId: user.id, email: user.email });
            return res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
        }
        logger.warn('Failed login attempt', { email });
        return res.status(400).send("Invalid Credentials");
    } catch (err) {
        logger.error('Login error', { error: err.message });
        console.log(err);
        res.status(500).send("Server Error");
    }
};

const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const oldUser = await prisma.user.findUnique({ where: { email } });

        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
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
        res.status(201).json(user);
    } catch (err) {
        logger.error('Registration error', { error: err.message, email: req.body.email });
        console.log(err);
        res.status(500).send("Error creating user");
    }
}

module.exports = { login, register };
