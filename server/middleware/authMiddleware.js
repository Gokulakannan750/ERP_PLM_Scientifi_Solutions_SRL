const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).send('A token is required for authentication');
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send('Invalid Token');
    }

    return next();
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === 'ADMIN' || req.user.role === 'SUB_ADMIN') { // Adjust based on strictness
            next();
        } else {
            res.status(403).json("You are not allowed to do that!");
        }
    });
};

module.exports = { verifyToken, verifyAdmin };
