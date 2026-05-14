const dotenv = require('dotenv');
dotenv.config();

const logger = require('./utils/logger');

// Validate required env vars before loading anything else
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('FATAL: JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
  logger.info(`Swagger docs at http://0.0.0.0:${PORT}/api-docs`);
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Swagger docs at http://0.0.0.0:${PORT}/api-docs`);
});
