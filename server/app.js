// app.js — Express application factory (no listen call).
// Imported by index.js for production and by tests for supertest.

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const logger = require('./utils/logger');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 20 : 500,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 60,
  message: { error: 'Too many file upload requests, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth',              require('./routes/authRoutes'));
app.use('/api/categories',        require('./routes/contactCategoryRoutes'));
app.use('/api/companies',         require('./routes/companyRoutes'));
app.use('/api/contacts',          require('./routes/contactRoutes'));
app.use('/api/inventory',         require('./routes/inventoryRoutes'));
app.use('/api/projects',          require('./routes/projectRoutes'));
app.use('/api/plm',               require('./routes/plmRoutes'));
app.use('/api/offers',            require('./routes/offerRoutes'));
app.use('/api/invoices',          require('./routes/invoiceRoutes'));
app.use('/api/credit-notes',        require('./routes/creditNoteRoutes'));
app.use('/api/purchase-requests',   require('./routes/purchaseRequestRoutes'));
app.use('/api/delivery-notes',      require('./routes/deliveryNoteRoutes'));
app.use('/api/admin',             require('./routes/adminRoutes'));
app.use('/api/settings',          require('./routes/settingsRoutes'));
app.use('/api/dashboard',         require('./routes/dashboardRoutes'));
app.use('/api/product-categories',require('./routes/productCategoryRoutes'));

// Apply stricter upload rate limiter to file upload endpoints
app.use('/api/plm/items/:id/files',       uploadLimiter);
app.use('/api/companies/:id/documents',   uploadLimiter);
app.use('/api/projects/:id/documents',    uploadLimiter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Scientific Solutions ERP API',
}));

app.get('/', (req, res) => {
  res.json({ status: 'ok', docs: '/api-docs' });
});

// Global error handler
app.use((err, req, res, next) => {
  // Multer file type rejection
  if (err && err.message && err.message.startsWith('File type')) {
    return res.status(400).json({ error: err.message });
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
  });
});

module.exports = app;
