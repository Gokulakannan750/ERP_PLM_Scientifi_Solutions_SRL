const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/authRoutes');
const contactCategoryRoutes = require('./routes/contactCategoryRoutes');
const companyRoutes = require('./routes/companyRoutes');
const contactRoutes = require('./routes/contactRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const projectRoutes = require('./routes/projectRoutes');
const offerRoutes = require('./routes/offerRoutes');

dotenv.config();

// Validate environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('FATAL: JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', contactCategoryRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));


app.get('/', (req, res) => {
  res.send('ERP Server is running');
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
  logger.info(`Access from network at http://192.168.1.4:${PORT}`);
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from network at http://192.168.1.4:${PORT}`);
});
