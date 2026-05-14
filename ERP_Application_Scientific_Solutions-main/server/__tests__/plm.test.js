/**
 * PLM controller tests — covers lifecycle state machine and checkout rules.
 * Prisma is mocked so no real DB is needed.
 */

jest.mock('../prismaClient', () => ({
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  plmCounter: { update: jest.fn() },
  plmAuditLog: { create: jest.fn(), findMany: jest.fn() },
  bomItem: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
  plmTemplate: { findFirst: jest.fn() },
  productDocument: { findMany: jest.fn(), create: jest.fn(), count: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  plmMaterial: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
}));

process.env.JWT_SECRET = 'test-secret-that-is-32-chars-long!!';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const prisma = require('../prismaClient');

const adminToken = jwt.sign({ user_id: 1, email: 'admin@test.com', role: 'ADMIN' }, process.env.JWT_SECRET);
const userToken  = jwt.sign({ user_id: 2, email: 'user@test.com',  role: 'SUB_ADMIN' }, process.env.JWT_SECRET);

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

afterEach(() => jest.clearAllMocks());

// ── GET /api/plm/items ────────────────────────────────────────────────────────

describe('GET /api/plm/items', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/plm/items');
    expect(res.status).toBe(403);
  });

  it('returns paginated items for authenticated user', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/plm/items')
      .set(authHeader(userToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
  });
});

// ── POST /api/plm/items ───────────────────────────────────────────────────────

describe('POST /api/plm/items', () => {
  it('rejects invalid plmType', async () => {
    const res = await request(app)
      .post('/api/plm/items')
      .set(authHeader(userToken))
      .send({ name: 'Test Part', plmType: 'X' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid PLM Type/);
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/plm/items')
      .set(authHeader(userToken))
      .send({ plmType: 'P' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name is required/i);
  });

  it('creates a PLM item successfully', async () => {
    prisma.plmCounter.update.mockResolvedValue({ lastNumber: 1 });
    prisma.plmTemplate.findFirst.mockResolvedValue(null);
    const created = { id: 1, sku: 'P00001A', name: 'Test Part', plmType: 'P', lifecycleState: 'IN_WORK', revision: 'A', isLocked: false, isObsolete: false, checkedOutBy: null, modifiedBy: null, supplier: null, material: null };
    prisma.product.create.mockResolvedValue(created);
    prisma.plmAuditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/plm/items')
      .set(authHeader(userToken))
      .send({ name: 'Test Part', plmType: 'P' });

    expect(res.status).toBe(201);
    expect(res.body.item.sku).toBe('P00001A');
  });
});

// ── POST /api/plm/items/:id/checkout ─────────────────────────────────────────

describe('POST /api/plm/items/:id/checkout', () => {
  it('returns 409 when item is already checked out', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 1, lifecycleState: 'IN_WORK', isLocked: false, checkedOutByUserId: 99,
    });

    const res = await request(app)
      .post('/api/plm/items/1/checkout')
      .set(authHeader(userToken));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already checked out/i);
  });

  it('returns 400 when item is not IN_WORK', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 1, lifecycleState: 'RELEASED', isLocked: true, checkedOutByUserId: null,
    });

    const res = await request(app)
      .post('/api/plm/items/1/checkout')
      .set(authHeader(userToken));

    expect(res.status).toBe(400);
  });

  it('successfully checks out an IN_WORK item', async () => {
    const item = { id: 1, lifecycleState: 'IN_WORK', isLocked: false, checkedOutByUserId: null };
    const checkedOut = { ...item, checkedOutByUserId: 2, isLocked: true, checkedOutBy: null, modifiedBy: null, supplier: null, material: null };
    prisma.product.findUnique.mockResolvedValue(item);
    prisma.product.update.mockResolvedValue(checkedOut);
    prisma.plmAuditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/plm/items/1/checkout')
      .set(authHeader(userToken))
      .send({ note: 'editing' });

    expect(res.status).toBe(200);
    expect(res.body.isLocked).toBe(true);
  });
});

// ── PATCH /api/plm/items/:id/state ───────────────────────────────────────────

describe('PATCH /api/plm/items/:id/state', () => {
  it('allows only admin to release an item', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 1, lifecycleState: 'UNDER_REVIEW', modifiedByUserId: 2,
    });

    const res = await request(app)
      .patch('/api/plm/items/1/state')
      .set(authHeader(userToken))  // non-admin
      .send({ nextState: 'RELEASED' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Admin|Reviewer/i);
  });

  it('admin can release an UNDER_REVIEW item', async () => {
    const item = { id: 1, lifecycleState: 'UNDER_REVIEW', modifiedByUserId: 2 };
    const released = { ...item, lifecycleState: 'RELEASED', isLocked: true, isObsolete: false, checkedOutBy: null, modifiedBy: null, supplier: null, material: null };
    prisma.product.findUnique.mockResolvedValue(item);
    prisma.product.update.mockResolvedValue(released);
    prisma.plmAuditLog.create.mockResolvedValue({});

    const res = await request(app)
      .patch('/api/plm/items/1/state')
      .set(authHeader(adminToken))
      .send({ nextState: 'RELEASED' });

    expect(res.status).toBe(200);
    expect(res.body.lifecycleState).toBe('RELEASED');
  });

  it('rejects invalid lifecycle state', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 1, lifecycleState: 'IN_WORK' });

    const res = await request(app)
      .patch('/api/plm/items/1/state')
      .set(authHeader(adminToken))
      .send({ nextState: 'GARBAGE' });

    expect(res.status).toBe(400);
  });
});
