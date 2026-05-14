/**
 * Auth controller tests — uses supertest against the Express app.
 * Prisma is mocked so no real DB is required.
 */

jest.mock('../prismaClient', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Stub JWT_SECRET before app loads
process.env.JWT_SECRET = 'test-secret-that-is-32-chars-long!!';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

afterEach(() => jest.clearAllMocks());

// ── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 400 with JSON when credentials are wrong', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 200 with token when credentials are correct', async () => {
    const fakeUser = { id: 1, email: 'admin@example.com', password: 'hashed', role: 'ADMIN' };
    prisma.user.findUnique.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('admin@example.com');
  });

  it('returns 400 JSON (not plain text) on bad password', async () => {
    const fakeUser = { id: 1, email: 'u@e.com', password: 'hashed', role: 'SUB_ADMIN' };
    prisma.user.findUnique.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@e.com', password: 'bad' });

    expect(res.status).toBe(400);
    expect(res.type).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
  });
});

// ── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 409 JSON when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'exists@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'exists@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.type).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 201 with user data on successful registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed_password');
    prisma.user.create.mockResolvedValue({ id: 2, email: 'new@example.com', role: 'SUB_ADMIN' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'new@example.com');
  });
});
