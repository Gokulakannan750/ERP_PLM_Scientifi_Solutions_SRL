const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'A token is required for authentication' });
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.user = decoded;
        // Normalize userId field for consistency across controllers
        req.user.userId = decoded.user_id || decoded.userId || decoded.id;
    } catch (err) {
        return res.status(401).json({ error: 'Invalid Token' });
    }

    return next();
};

// ADMIN only - strict role check
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === 'ADMIN') {
            next();
        } else {
            res.status(403).json({ error: "Admin access required" });
        }
    });
};

// Check if user has a specific permission
const verifyPermission = (permissionName) => {
    return async (req, res, next) => {
        verifyToken(req, res, async () => {
            try {
                // ADMIN role has all permissions
                if (req.user.role === 'ADMIN') {
                    return next();
                }

                // Check if user has the specific permission
                const userPermission = await prisma.userPermission.findFirst({
                    where: {
                        userId: req.user.user_id,
                        permission: {
                            name: permissionName
                        }
                    },
                    include: {
                        permission: true
                    }
                });

                if (userPermission) {
                    next();
                } else {
                    res.status(403).json({
                        error: "Permission denied",
                        required: permissionName
                    });
                }
            } catch (error) {
                console.error('Permission check error:', error);
                res.status(500).json({ error: "Error checking permissions" });
            }
        });
    };
};

// Check if user has ANY of the specified permissions
const verifyAnyPermission = (permissionNames) => {
    return async (req, res, next) => {
        verifyToken(req, res, async () => {
            try {
                // ADMIN role has all permissions
                if (req.user.role === 'ADMIN') {
                    return next();
                }

                // Check if user has any of the specified permissions
                const userPermission = await prisma.userPermission.findFirst({
                    where: {
                        userId: req.user.user_id,
                        permission: {
                            name: { in: permissionNames }
                        }
                    },
                    include: {
                        permission: true
                    }
                });

                if (userPermission) {
                    next();
                } else {
                    res.status(403).json({
                        error: "Permission denied",
                        requiredAny: permissionNames
                    });
                }
            } catch (error) {
                console.error('Permission check error:', error);
                res.status(500).json({ error: "Error checking permissions" });
            }
        });
    };
};

module.exports = { verifyToken, verifyAdmin, verifyPermission, verifyAnyPermission };
