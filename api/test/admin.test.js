import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import authRoutes from '../src/routes/auth.js';
import farmRoutes from '../src/routes/farms.js';
import productRoutes from '../src/routes/products.js';
import orderRoutes from '../src/routes/orders.js';
import paymentRoutes from '../src/routes/payments.js';
import adminRoutes from '../src/routes/admin.js';
import disputeRoutes from '../src/routes/disputes.js';
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
  await fastify.register(multipart);
  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/'
  });

  fastify.decorate('prisma', prisma);
  fastify.decorate('authenticate', requireAuth);
  fastify.decorate('requireRole', requireRole);

  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(farmRoutes, { prefix: '/api/v1/farms' });
  await fastify.register(productRoutes, { prefix: '/api/v1/products' });
  await fastify.register(orderRoutes, { prefix: '/api/v1/orders' });
  await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
  await fastify.register(disputeRoutes, { prefix: '/api/v1' });

  return fastify;
}

test('Sprint 4 Admin Governance, Verification & Disputes Test Suite', async (t) => {
  const app = await buildApp();

  // Clean test DB
  await prisma.dispute.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['s4admin@example.com', 's4farmer@example.com', 's4buyer@example.com']
      }
    }
  });

  let adminToken = '';
  let farmerToken = '';
  let buyerToken = '';
  let adminId = '';
  let farmId = '';
  let orderId = '';
  let disputeId = '';

  await t.test('Setup Admin, Farmer & Buyer Accounts', async () => {
    // Seed Admin User
    const hashedAdminPassword = await bcrypt.hash('AdminPassword123!', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 's4admin@example.com',
        phone: '+2348000000000',
        password_hash: hashedAdminPassword,
        role: 'admin',
        verified: true
      }
    });
    adminId = admin.id;

    // Login as Admin to get Token
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 's4admin@example.com', password: 'AdminPassword123!' }
    });
    adminToken = adminLogin.json().token;

    // Register Farmer & Pending Farm
    const fRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Sani Umar',
        email: 's4farmer@example.com',
        phone: '+2348011223300',
        password: 'FarmerPassword123!',
        role: 'farmer'
      }
    });
    farmerToken = fRes.json().token;

    const farmRes = await app.inject({
      method: 'POST',
      url: '/api/v1/farms',
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: {
        farm_name: 'Sani Vegetable Estate',
        state: 'Kano',
        city: 'Wudil',
        address: 'Wudil Sector 4'
      }
    });
    farmId = farmRes.json().farm.id;

    // Register Buyer
    const bRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Bello Garba',
        email: 's4buyer@example.com',
        phone: '+2348022334455',
        password: 'BuyerPassword123!',
        role: 'buyer'
      }
    });
    buyerToken = bRes.json().token;
  });

  await t.test('Test 1: Admin lists pending farm storefronts (GET /admin/farms/pending)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/farms/pending',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.count, 1);
    assert.equal(body.farms[0].farm_name, 'Sani Vegetable Estate');
  });

  await t.test('Test 2: Admin approves farm profile (POST /admin/farms/:id/verify)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/farms/${farmId}/verify`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'verified' }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.farm.verification_status, 'verified');
    assert.equal(body.farm.verified_by, adminId);
    assert.ok(body.farm.verified_at);
  });

  await t.test('Test 3: Setup Order & Buyer opens dispute (POST /orders/:id/dispute)', async () => {
    // Add product to verified farm
    const prodRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: {
        farm_id: farmId,
        name: 'Fresh Cabbage',
        category: 'Vegetables',
        price: 8000,
        unit: 'Basket',
        quantity_available: 20
      }
    });
    const productId = prodRes.json().product.id;

    // Buyer places order
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        items: [{ product_id: productId, quantity: 1 }],
        delivery_address: 'No 12 BUK Road',
        delivery_state: 'Kano',
        delivery_city: 'Kano City'
      }
    });
    orderId = orderRes.json().order.id;

    // Open Dispute
    const disputeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/dispute`,
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: { reason: 'Cabbage arrived wilted and damaged in transit' }
    });

    assert.equal(disputeRes.statusCode, 201);
    const body = disputeRes.json();
    assert.equal(body.dispute.status, 'open');
    disputeId = body.dispute.id;

    // Order status should be set to 'disputed'
    const orderInDb = await prisma.order.findUnique({ where: { id: orderId } });
    assert.equal(orderInDb.status, 'disputed');
  });

  await t.test('Test 4: Admin lists open disputes (GET /admin/disputes)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/disputes',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.count, 1);
    assert.equal(body.disputes[0].id, disputeId);
  });

  await t.test('Test 5: Admin resolves dispute via refund (POST /admin/disputes/:id/resolve)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/disputes/${disputeId}/resolve`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { resolution: 'resolved_refund' }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.message, 'Dispute resolved. Payment refunded to buyer.');

    const disputeInDb = await prisma.dispute.findUnique({ where: { id: disputeId } });
    assert.equal(disputeInDb.status, 'resolved_refund');
    assert.equal(disputeInDb.resolved_by, adminId);
  });

  await t.test('Test 6: Non-admin user calling GET /admin/farms/pending -> HTTP 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/farms/pending',
      headers: { authorization: `Bearer ${farmerToken}` }
    });

    assert.equal(res.statusCode, 403);
  });

  await t.test('Test 7: Platform analytics query (GET /admin/analytics)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/analytics',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.analytics);
    assert.equal(typeof body.analytics.totalUsers, 'number');
    assert.equal(typeof body.analytics.verifiedFarms, 'number');
  });

  await app.close();
});
