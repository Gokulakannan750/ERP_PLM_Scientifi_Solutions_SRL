/**
 * Inventory controller tests — covers product CRUD and stock operations.
 * Prisma is mocked so no real DB is needed.
 */

jest.mock('../prismaClient', () => ({
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  stockMovement: { findMany: jest.fn(), create: jest.fn() },
  stockBatch: { create: jest.fn() },
  purchaseRequest: { findFirst: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret-that-is-32-chars-long!!';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const prisma = require('../prismaClient');

const token = jwt.sign({ user_id: 1, email: 'user@test.com', role: 'ADMIN' }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

afterEach(() => jest.clearAllMocks());

// ── GET /api/inventory ────────────────────────────────────────────────────────

describe('GET /api/inventory', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(403);
  });

  it('returns products for authenticated user', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/inventory').set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── POST /api/inventory ───────────────────────────────────────────────────────

describe('POST /api/inventory', () => {
  it('returns 400 when SKU is missing and no category/subcategory given', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set(auth)
      .send({ name: 'Widget', price: 9.99, quantity: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/SKU/i);
  });

  it('creates a product with all required fields', async () => {
    const created = { id: 1, sku: 'AB12345', name: 'Widget', description: null, price: 9.99, quantity: 10, isLatest: true, supplier: null, modifiedBy: null };
    prisma.product.findFirst.mockResolvedValue(null); // no existing SKU counter
    prisma.product.create.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/inventory')
      .set(auth)
      .send({ name: 'Widget', sku: 'AB12345', price: 9.99, quantity: 10 });

    expect(res.status).toBe(200);
    expect(res.body.sku).toBe('AB12345');
    expect(res.body.name).toBe('Widget');
  });
});

// ── GET /api/inventory/:id ────────────────────────────────────────────────────

describe('GET /api/inventory/:id', () => {
  it('returns 404 when product not found', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/inventory/999').set(auth);
    expect(res.status).toBe(404);
  });

  it('returns product when found', async () => {
    const product = { id: 5, sku: 'XY00001', name: 'Sensor', price: 49.99, quantity: 3, supplier: null, modifiedBy: null, checkedOutBy: null };
    prisma.product.findUnique.mockResolvedValue(product);
    const res = await request(app).get('/api/inventory/5').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.sku).toBe('XY00001');
  });
});

// ── POST /api/inventory/:id/check-in ─────────────────────────────────────────

describe('POST /api/inventory/:id/check-in', () => {
  it('returns 400 for invalid quantity', async () => {
    const res = await request(app)
      .post('/api/inventory/1/check-in')
      .set(auth)
      .send({ quantity: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid quantity/i);
  });

  it('successfully adds stock', async () => {
    const updatedProduct = { id: 2, sku: 'AA00001', name: 'Part', quantity: 15, isLatest: true };
    prisma.$transaction.mockImplementation(async (fn) => fn({
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, quantity: 10, isLatest: true }),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue(updatedProduct),
      },
      stockMovement: { create: jest.fn() },
      stockBatch: { create: jest.fn() },
    }));

    const res = await request(app)
      .post('/api/inventory/1/check-in')
      .set(auth)
      .send({ quantity: 5, reason: 'Delivery' });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(15);
  });
});
