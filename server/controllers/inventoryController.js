const prisma = require('../prismaClient');

// ─── SKU Generation ───────────────────────────────────────────
// Format: xxyyaaaaa  (e.g. EL-PC-00042)
const generateSku = async (categoryCode, subcategoryCode) => {
  if (!categoryCode || !subcategoryCode) return null;

  const cc = categoryCode.toUpperCase().slice(0, 2).padEnd(2, 'X');
  const sc = subcategoryCode.toUpperCase().slice(0, 2).padEnd(2, 'X');

  // Find max counter for this category+subcategory across all versions
  const latest = await prisma.product.findFirst({
    where: { categoryCode: cc, subcategoryCode: sc, skuCounter: { not: null } },
    orderBy: { skuCounter: 'desc' },
    select: { skuCounter: true }
  });

  const counter = (latest?.skuCounter ?? 0) + 1;
  const sku = `${cc}${sc}${String(counter).padStart(5, '0')}`;
  return { sku, counter };
};

// ─── Products ─────────────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { showObsolete } = req.query;
    const products = await prisma.product.findMany({
      where: showObsolete === 'true' ? { isLatest: true } : { isLatest: true, isObsolete: false },
      include: {
        supplier: true,
        modifiedBy: { select: { id: true, email: true, name: true } }
      },
      orderBy: { recDate: 'desc' }
    });

    // Calculate version number for each product
    const productsWithVersion = await Promise.all(products.map(async (product) => {
      let versionCount = 1;
      let currentId = product.lastRecID;
      while (currentId) {
        versionCount++;
        const prev = await prisma.product.findUnique({
          where: { id: currentId },
          select: { lastRecID: true }
        });
        currentId = prev?.lastRecID || null;
      }
      return { ...product, version: versionCount };
    }));

    res.json(productsWithVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        supplier: true,
        modifiedBy:    { select: { id: true, email: true, name: true } },
        checkedOutBy:  { select: { id: true, email: true, name: true } },
      }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Compute TCO inline for single-product view
    const unit     = parseFloat(product.price || 0);
    const shipping = parseFloat(product.shippingCostPerItem || 0);
    const duty     = parseFloat(product.importDutyPercentage || 0) / 100;
    const tco = unit + shipping + (unit + shipping) * duty;

    res.json({ ...product, tco: parseFloat(tco.toFixed(4)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { 
      name, sku: manualSku, description, price, quantity, minLevel, maxLevel, supplierId, categoryCode, subcategoryCode,
      brand, itemType, unitOfMeasure, currency, importDutyPercentage, shippingCostPerItem, alternativeSupplierId,
      primarySupplierArticleNumber, alternativeSupplierArticleNumber, reorderQuantity, reorderTriggerThreshold,
      leadTimeDays, supplierQuoteReference, hsCode, storageFacility, storageWarehouse, storageShelf, storageBin,
      barcodeQrData, plmItemLink
    } = req.body;

    let finalSku = manualSku;
    let skuCounter = null;

    // Auto-generate SKU if category + subcategory are provided and no manual SKU given
    if (categoryCode && subcategoryCode && !manualSku) {
      const generated = await generateSku(categoryCode, subcategoryCode);
      if (generated) {
        finalSku = generated.sku;
        skuCounter = generated.counter;
      }
    }

    if (!finalSku) return res.status(400).json({ error: 'SKU is required (or select category + subcategory for auto-generation)' });

    const product = await prisma.product.create({
      data: {
        name: name?.trim() || '',
        sku: finalSku,
        description: description?.trim() || null,
        price: parseFloat(price),
        quantity: parseInt(quantity) || 0,
        minLevel: parseInt(minLevel) || 5,
        maxLevel: parseInt(maxLevel) || 100,
        supplierId: supplierId ? parseInt(supplierId) : null,
        categoryCode: categoryCode ? categoryCode.toUpperCase().slice(0, 2) : null,
        subcategoryCode: subcategoryCode ? subcategoryCode.toUpperCase().slice(0, 2) : null,
        skuCounter,
        brand, itemType, unitOfMeasure, currency: currency || "USD",
        importDutyPercentage: importDutyPercentage ? parseFloat(importDutyPercentage) : null,
        shippingCostPerItem: shippingCostPerItem ? parseFloat(shippingCostPerItem) : null,
        alternativeSupplierId: alternativeSupplierId ? parseInt(alternativeSupplierId) : null,
        primarySupplierArticleNumber, alternativeSupplierArticleNumber,
        reorderQuantity: reorderQuantity ? parseInt(reorderQuantity) : null,
        reorderTriggerThreshold: parseInt(reorderTriggerThreshold) || 5,
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null,
        supplierQuoteReference, hsCode, storageFacility, storageWarehouse, storageShelf, storageBin,
        barcodeQrData, plmItemLink,
        modifiedByUserId: req.user.userId,
        isLatest: true
      },
      include: {
        supplier: true,
        modifiedBy: { select: { id: true, email: true, name: true } }
      }
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { 
      name, sku, description, price, quantity, minLevel, maxLevel, supplierId, categoryCode, subcategoryCode,
      brand, itemType, unitOfMeasure, currency, importDutyPercentage, shippingCostPerItem, alternativeSupplierId,
      primarySupplierArticleNumber, alternativeSupplierArticleNumber, reorderQuantity, reorderTriggerThreshold,
      leadTimeDays, supplierQuoteReference, hsCode, storageFacility, storageWarehouse, storageShelf, storageBin,
      barcodeQrData, plmItemLink, isObsolete
    } = req.body;

    const currentProduct = await prisma.product.findFirst({
      where: { id: productId, isLatest: true }
    });
    if (!currentProduct) return res.status(404).json({ error: 'Product not found' });

    // Mark current as not latest
    await prisma.product.update({ where: { id: productId }, data: { isLatest: false } });

    // Determine SKU for new version
    let finalSku = sku || currentProduct.sku;
    let skuCounter = currentProduct.skuCounter;

    const newVersion = await prisma.product.create({
      data: {
        name: name?.trim() || currentProduct.name,
        sku: finalSku,
        description: description?.trim() ?? currentProduct.description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        minLevel: parseInt(minLevel) || 5,
        maxLevel: parseInt(maxLevel) || 100,
        supplierId: supplierId ? parseInt(supplierId) : null,
        categoryCode: categoryCode ? categoryCode.toUpperCase().slice(0, 2) : currentProduct.categoryCode,
        subcategoryCode: subcategoryCode ? subcategoryCode.toUpperCase().slice(0, 2) : currentProduct.subcategoryCode,
        skuCounter,
        brand, itemType, unitOfMeasure, currency: currency || "USD",
        importDutyPercentage: importDutyPercentage ? parseFloat(importDutyPercentage) : null,
        shippingCostPerItem: shippingCostPerItem ? parseFloat(shippingCostPerItem) : null,
        alternativeSupplierId: alternativeSupplierId ? parseInt(alternativeSupplierId) : null,
        primarySupplierArticleNumber, alternativeSupplierArticleNumber,
        reorderQuantity: reorderQuantity ? parseInt(reorderQuantity) : null,
        reorderTriggerThreshold: parseInt(reorderTriggerThreshold) || 5,
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null,
        supplierQuoteReference, hsCode, storageFacility, storageWarehouse, storageShelf, storageBin,
        barcodeQrData, plmItemLink, isObsolete: isObsolete === true,
        lastRecID: productId,
        modifiedByUserId: req.user.userId,
        isLatest: true
      },
      include: {
        supplier: true,
        modifiedBy: { select: { id: true, email: true, name: true } }
      }
    });

    res.json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.update({ where: { id: parseInt(id) }, data: { isLatest: false } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkInStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, batchNumber, lotNumber, serialNumber, supplierId } = req.body;
    const productId = parseInt(id);
    const qty = parseInt(quantity);

    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Invalid quantity' });

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, isLatest: true } });
      if (!product) throw new Error('Product not found');

      // Update current product as old version
      await tx.product.update({ where: { id: productId }, data: { isLatest: false } });

      // Create new version
      const updatedProduct = await tx.product.create({
        data: {
          ...product,
          id: undefined,
          quantity: product.quantity + qty,
          lastRecID: productId,
          modifiedByUserId: req.user.userId,
          isLatest: true
        }
      });

      // Log movement
      await tx.stockMovement.create({
        data: { productId: updatedProduct.id, type: 'IN', quantity: qty, reason }
      });

      // Create StockBatch for traceability
      await tx.stockBatch.create({
        data: {
          productId: updatedProduct.id,
          batchNumber, lotNumber, serialNumber,
          quantity: qty, currentQty: qty,
          supplierId: supplierId ? parseInt(supplierId) : null
        }
      });

      return updatedProduct;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkOutStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;
    const productId = parseInt(id);
    const qty = parseInt(quantity);

    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Invalid quantity' });

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, isLatest: true } });
      if (!product) throw new Error('Product not found');
      if (product.quantity < qty) throw new Error('Insufficient stock');

      const newQuantity = product.quantity - qty;

      await tx.product.update({ where: { id: productId }, data: { isLatest: false } });

      const updatedProduct = await tx.product.create({
        data: {
          ...product,
          id: undefined,
          quantity: newQuantity,
          lastRecID: productId,
          modifiedByUserId: req.user.userId,
          isLatest: true
        }
      });

      await tx.stockMovement.create({
        data: { productId: updatedProduct.id, type: 'OUT', quantity: qty, reason }
      });

      // Check reorder threshold and auto-generate Purchase Request
      const threshold = updatedProduct.reorderTriggerThreshold || updatedProduct.minLevel || 5;
      if (newQuantity <= threshold) {
        // Check if there is already a PENDING purchase request
        const existingReq = await tx.purchaseRequest.findFirst({
          where: { productId: updatedProduct.id, status: 'PENDING' }
        });
        if (!existingReq) {
          await tx.purchaseRequest.create({
            data: {
              productId: updatedProduct.id,
              quantity: updatedProduct.reorderQuantity || (updatedProduct.maxLevel - newQuantity),
              supplierId: updatedProduct.supplierId,
              requestedByUserId: req.user.userId
            }
          });
        }
      }

      return updatedProduct;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const movements = await prisma.stockMovement.findMany({
      where: { productId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProductHistory = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let latestId = productId;
    if (!product.isLatest) {
      let current = product;
      while (current) {
        const next = await prisma.product.findFirst({
          where: { lastRecID: current.id, isLatest: true }
        });
        if (next) { latestId = next.id; break; }
        const nextVersion = await prisma.product.findFirst({ where: { lastRecID: current.id } });
        if (!nextVersion) break;
        current = nextVersion;
      }
    }

    const history = [];
    let currentId = latestId;
    while (currentId) {
      const version = await prisma.product.findUnique({
        where: { id: currentId },
        include: {
          supplier: true,
          modifiedBy: { select: { id: true, email: true, name: true } }
        }
      });
      if (!version) break;
      history.push(version);
      currentId = version.lastRecID;
    }

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product history' });
  }
};

// ─── Stock Report ─────────────────────────────────────────────
// Returns: current stock levels, items below reorder threshold, 7-day movement summary.
const getStockReport = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isLatest: true, isObsolete: false },
      select: {
        id: true, sku: true, name: true, quantity: true, minLevel: true, maxLevel: true,
        reorderTriggerThreshold: true, reorderQuantity: true,
        supplier: { select: { id: true, name: true } },
        currency: true, price: true,
      },
      orderBy: { quantity: 'asc' },
    });

    const reorderItems = products.filter(p => p.quantity <= (p.reorderTriggerThreshold ?? p.minLevel ?? 5));
    const okItems      = products.filter(p => p.quantity >  (p.reorderTriggerThreshold ?? p.minLevel ?? 5));

    // 7-day movement summary
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const movements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: since7d } },
      select: { type: true, quantity: true, createdAt: true },
    });
    const inQty  = movements.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0);
    const outQty = movements.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0);

    res.json({
      summary: {
        totalProducts: products.length,
        reorderCount:  reorderItems.length,
        okCount:       okItems.length,
        last7dIn:      inQty,
        last7dOut:     outQty,
      },
      reorderItems,
      allProducts: products,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Purchase Cost Analysis ────────────────────────────────────
// Returns price history and TCO for a single product, plus supplier comparison.
const getCostAnalysis = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    // Full version chain (oldest → newest)
    let versions = [];
    const latest = await prisma.product.findFirst({ where: { id: productId } });
    if (!latest) return res.status(404).json({ error: 'Product not found' });

    // Walk the version chain
    let current = latest;
    while (current) {
      versions.push({
        id:        current.id,
        price:     parseFloat(current.price),
        recDate:   current.recDate,
        isLatest:  current.isLatest,
      });
      if (!current.lastRecID) break;
      current = await prisma.product.findUnique({ where: { id: current.lastRecID }, select: { id: true, price: true, recDate: true, isLatest: true, lastRecID: true } });
      if (!current) break;
    }
    versions = versions.reverse(); // oldest first

    // Recent stock movements (30 days)
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const movements = await prisma.stockMovement.findMany({
      where: { productId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    // TCO calculation: unit + shipping + (unit + shipping) × importDuty %
    const latestProduct = await prisma.product.findFirst({
      where: { id: productId, isLatest: true },
      select: { price: true, shippingCostPerItem: true, importDutyPercentage: true, currency: true, unitOfMeasure: true }
    });
    let tco = null;
    if (latestProduct) {
      const unit     = parseFloat(latestProduct.price || 0);
      const shipping = parseFloat(latestProduct.shippingCostPerItem || 0);
      const duty     = parseFloat(latestProduct.importDutyPercentage || 0) / 100;
      tco = {
        unitPrice:           unit,
        shippingCost:        shipping,
        importDutyPercent:   parseFloat(latestProduct.importDutyPercentage || 0),
        totalCostOfOwnership: parseFloat((unit + shipping + (unit + shipping) * duty).toFixed(4)),
        currency:            latestProduct.currency || 'USD',
      };
    }

    res.json({ priceHistory: versions, movements, tco });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── SKU Preview ──────────────────────────────────────────────
const previewSku = async (req, res) => {
  try {
    const { categoryCode, subcategoryCode } = req.query;
    if (!categoryCode || !subcategoryCode) {
      return res.status(400).json({ error: 'categoryCode and subcategoryCode are required' });
    }
    const generated = await generateSku(categoryCode, subcategoryCode);
    res.json({ sku: generated?.sku || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  checkInStock, checkOutStock, getHistory, getProductHistory, previewSku,
  getStockReport, getCostAnalysis,
};
