import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import authRoutes from '../src/routes/auth.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';

const prisma = new PrismaClient();

async function buildApp() {
  const fastify = Fastify();
  await fastify.register(cors);
  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: 'test-secret-key-12345',
    cookie: { cookieName: 'token', signed: false }
  });
  fastify.decorate('prisma', prisma);
  fastify.decorate('authenticate', requireAuth);
  fastify.decorate('requireRole', requireRole);
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  return fastify;
}

test('Sprint 1 Authentication & Role Authorization Test Suite', async (t) => {
  const app = await buildApp();

  // Cleanup test users before running
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'testfarmer@example.com',
          'dupemail@example.com',
          'testbuyer@example.com',
          'hackeradmin@example.com'
        ]
      }
    }
  });

  let farmerToken = '';
  let buyerToken = '';

  await t.test('Test 1: Register as farmer with valid data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Musa Garba',
        email: 'testfarmer@example.com',
        phone: '+2348011112222',
        password: 'FarmerPassword123!',
        role: 'farmer'
      }
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.user.role, 'farmer');
    assert.equal(body.user.verified, false);
    assert.ok(body.token);
    farmerToken = body.token;
  });

  await t.test('Test 2: Register with an email already in use', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Duplicate Musa',
        email: 'testfarmer@example.com',
        phone: '+2348099998888',
        password: 'AnotherPassword123!',
        role: 'farmer'
      }
    });

    assert.equal(res.statusCode, 409);
    const body = res.json();
    assert.equal(body.error, 'Conflict');
  });

  await t.test('Test 3: Register with role: admin in payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Hacker Admin',
        email: 'hackeradmin@example.com',
        phone: '+2348000009999',
        password: 'HackerPassword123!',
        role: 'admin'
      }
    });

    assert.equal(res.statusCode, 400);
  });

  await t.test('Test 4: Login with correct credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'testfarmer@example.com',
        password: 'FarmerPassword123!'
      }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.token);
  });

  await t.test('Test 5: Login with wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'testfarmer@example.com',
        password: 'WrongPassword123!'
      }
    });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.message, 'Invalid credentials');
  });

  await t.test('Test 6: Inspect users table directly in DB to verify password hashing', async () => {
    const userInDb = await prisma.user.findUnique({
      where: { email: 'testfarmer@example.com' }
    });

    assert.ok(userInDb);
    assert.notEqual(userInDb.password_hash, 'FarmerPassword123!');
    const isBcrypt = await bcrypt.compare('FarmerPassword123!', userInDb.password_hash);
    assert.equal(isBcrypt, true);
  });

  // Setup Buyer account for role tests
  await t.test('Setup Buyer Account', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Zainab Bello',
        email: 'testbuyer@example.com',
        phone: '+2348077776666',
        password: 'BuyerPassword123!',
        role: 'buyer'
      }
    });

    assert.equal(res.statusCode, 201);
    buyerToken = res.json().token;
  });

  await t.test('Test 7: Farmer token calling route guarded with requireRole(["admin"])', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/admin-only',
      headers: {
        authorization: `Bearer ${farmerToken}`
      }
    });

    assert.equal(res.statusCode, 403);
  });

  await t.test('Test 8: Buyer token calling route guarded with requireRole(["farmer"])', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/farmer-only',
      headers: {
        authorization: `Bearer ${buyerToken}`
      }
    });

    assert.equal(res.statusCode, 403);
  });

  await t.test('Test 9: GET /auth/me with no token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    });

    assert.equal(res.statusCode, 401);
  });

  await t.test('Test 10: GET /auth/me with valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${farmerToken}`
      }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.user.email, 'testfarmer@example.com');
    assert.equal(body.user.role, 'farmer');
  });

  await t.test('Test 11: Logout then try GET /auth/me again', async () => {
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${farmerToken}`
      }
    });

    assert.equal(logoutRes.statusCode, 200);

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
      // No token sent
    });

    assert.equal(meRes.statusCode, 401);
  });

  await t.test('Test 12: End-to-end role authorization validation', async () => {
    const farmerRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/farmer-only',
      headers: {
        authorization: `Bearer ${farmerToken}`
      }
    });

    assert.equal(farmerRes.statusCode, 200);
    assert.equal(farmerRes.json().message, 'Welcome to the Farmer restricted area!');
  });

  await app.close();
});
