import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import authRoutes from '../src/routes/auth.js';
import farmRoutes from '../src/routes/farms.js';
import productRoutes from '../src/routes/products.js';
import uploadRoutes from '../src/routes/uploads.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import prisma from './testPrisma.js';

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
  await fastify.register(uploadRoutes, { prefix: '/api/v1/uploads' });

  return fastify;
}

test('Sprint 2 Farm & Product Management Test Suite', async (t) => {
  const app = await buildApp();

  let farmerToken = '';
  let buyerToken = '';
  let farmerId = '';
  let farmId = '';
  let productId = '';

  await t.test('Setup Sprint 2 Test Accounts', async () => {
    // Clean ALL DB records for complete isolation
    await prisma.transaction.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.farm.deleteMany();
    await prisma.user.deleteMany();

    // 1. Register Farmer (Unverified)
    const fRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Usman Danbatta',
        email: 's2farmer@example.com',
        phone: '+2348055554444',
        password: 'FarmerPassword123!',
        role: 'farmer'
      }
    });
    farmerToken = fRes.json().token;
    farmerId = fRes.json().user.id;

    // 2. Register Buyer
    const bRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Aisha Bello',
        email: 's2buyer@example.com',
        phone: '+2348066667777',
        password: 'BuyerPassword123!',
        role: 'buyer'
      }
    });
    buyerToken = bRes.json().token;
  });

  await t.test('Test 1: Create farm profile as farmer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/farms',
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: {
        farm_name: 'Danbatta Grain Reserve',
        state: 'Kano',
        city: 'Wudil',
        address: 'KM 10 Wudil Road'
      }
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.farm.farm_name, 'Danbatta Grain Reserve');
    assert.equal(body.farm.verification_status, 'pending');
    farmId = body.farm.id;
  });

  await t.test('Test 2: Create product listing for pending farm -> Excluded from public search (Rule #2)', async () => {
    const pRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: {
        farm_id: farmId,
        name: 'Premium Local Rice',
        category: 'Grains',
        price: 42000,
        unit: '50kg Bag',
        quantity_available: 50
      }
    });

    assert.equal(pRes.statusCode, 201);
    productId = pRes.json().product.id;

    // Verify public browse DOES NOT show this product because farm is 'pending'
    const browseRes = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });

    assert.equal(browseRes.statusCode, 200);
    const browseBody = browseRes.json();
    assert.equal(browseBody.count, 0);
  });

  await t.test('Test 3: Admin verifies farm -> Product listing immediately appears in public search', async () => {
    // Admin verifies farm directly in DB
    await prisma.farm.update({
      where: { id: farmId },
      data: { verification_status: 'verified' }
    });

    const browseRes = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });

    assert.equal(browseRes.statusCode, 200);
    const browseBody = browseRes.json();
    assert.equal(browseBody.count, 1);
    assert.equal(browseBody.products[0].name, 'Premium Local Rice');
    assert.equal(browseBody.products[0].farm.farm_name, 'Danbatta Grain Reserve');
  });

  await t.test('Test 4: Filter produce by State & City (GET /products?state=Kano&city=Wudil)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products?state=Kano&city=Wudil&category=Grains'
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().count, 1);

    const emptyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/products?state=Kano&city=Abuja'
    });
    assert.equal(emptyRes.json().count, 0);
  });

  await t.test('Test 5: Substring keyword search (GET /products?search=rice)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products?search=rice'
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().count, 1);
  });

  await t.test('Test 6: Farmer updates price & stock count (PATCH /products/:id)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${productId}`,
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: {
        price: 45000,
        quantity_available: 45
      }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.product.price, 45000);
    assert.equal(body.product.quantity_available, 45);
  });

  await t.test('Test 7: Farmer deactivates listing -> Removed from public browse', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${productId}/status`,
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: { is_active: false }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().product.is_active, false);

    const browseRes = await app.inject({
      method: 'GET',
      url: '/api/v1/products'
    });

    assert.equal(browseRes.json().count, 0);

    // Reactivate for remaining tests
    await prisma.product.update({
      where: { id: productId },
      data: { is_active: true }
    });
  });

  await t.test('Test 8: Buyer token calling POST /products -> HTTP 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        farm_id: farmId,
        name: 'Hacked Tomatoes',
        category: 'Vegetables',
        price: 5000,
        unit: 'Basket',
        quantity_available: 10
      }
    });

    assert.equal(res.statusCode, 403);
  });

  await app.close();
});
