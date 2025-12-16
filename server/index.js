const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const contactCategoryRoutes = require('./routes/contactCategoryRoutes');
const companyRoutes = require('./routes/companyRoutes');
const contactRoutes = require('./routes/contactRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const projectRoutes = require('./routes/projectRoutes');
const offerRoutes = require('./routes/offerRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/categories', contactCategoryRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/invoices', require('./routes/invoiceRoutes'));

app.get('/', (req, res) => {
  res.send('ERP Server is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
