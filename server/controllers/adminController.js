const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const PERMISSIONS = require('../constants/permissions');

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                permissions: {
                    include: {
                        permission: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Transform permissions to flat array
        const usersWithPermissions = users.map(user => ({
            ...user,
            permissions: user.permissions.map(up => up.permission)
        }));

        logger.info('Retrieved all users', { count: usersWithPermissions.length });
        res.status(200).json(usersWithPermissions);
    } catch (error) {
        logger.error('Error fetching users', { error: error.message });
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

// Get a specific user
const getUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Transform permissions to flat array
        const userWithPermissions = {
            ...user,
            permissions: user.permissions.map(up => up.permission)
        };

        res.status(200).json(userWithPermissions);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
};

// Create new user (sub-admin)
const createUser = async (req, res) => {
    try {
        const { email, password, name, role, permissionIds, isActive } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with permissions
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name: name || null,
                role: role || 'SUB_ADMIN',
                isActive: isActive !== undefined ? isActive : true,
                permissions: permissionIds && permissionIds.length > 0 ? {
                    create: permissionIds.map(permissionId => ({
                        permissionId: parseInt(permissionId)
                    }))
                } : undefined
            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        logger.info('Created new user', { userId: user.id, email: user.email, role: user.role });
        res.status(201).json({
            ...userWithoutPassword,
            permissions: user.permissions.map(up => up.permission)
        });
    } catch (error) {
        logger.error('Error creating user', { error: error.message, email: req.body.email });
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, name, role, isActive } = req.body;

        const updateData = {};

        if (email) updateData.email = email.toLowerCase();
        if (name !== undefined) updateData.name = name;
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        res.status(200).json({
            ...user,
            permissions: user.permissions.map(up => up.permission)
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error updating user' });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (parseInt(id) === req.user.user_id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        logger.info('Deleted user', { userId: parseInt(id) });
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Error deleting user', { error: error.message, userId: id });
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
};

// Get user's permissions
const getUserPermissions = async (req, res) => {
    try {
        const { id } = req.params;

        const userPermissions = await prisma.userPermission.findMany({
            where: { userId: parseInt(id) },
            include: {
                permission: true
            }
        });

        res.status(200).json(userPermissions.map(up => up.permission));
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ error: 'Error fetching user permissions' });
    }
};

// Update user's permissions
const updateUserPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body;

        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ error: 'permissionIds must be an array' });
        }

        // Delete existing permissions
        await prisma.userPermission.deleteMany({
            where: { userId: parseInt(id) }
        });

        // Create new permissions
        if (permissionIds.length > 0) {
            await prisma.userPermission.createMany({
                data: permissionIds.map(permissionId => ({
                    userId: parseInt(id),
                    permissionId: parseInt(permissionId)
                }))
            });
        }

        // Fetch updated user with permissions
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        res.status(200).json({
            ...user,
            permissions: user.permissions.map(up => up.permission)
        });
    } catch (error) {
        console.error('Error updating user permissions:', error);
        res.status(500).json({ error: 'Error updating user permissions' });
    }
};

// Get all available permissions
const getAllPermissions = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [
                { category: 'asc' },
                { name: 'asc' }
            ]
        });

        res.status(200).json(permissions);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Error fetching permissions' });
    }
};

module.exports = {
    getAllUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserPermissions,
    updateUserPermissions,
    getAllPermissions
};
