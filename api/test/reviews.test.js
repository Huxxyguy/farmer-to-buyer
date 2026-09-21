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
import orderRoutes from '../src/routes/orders.js';
import paymentRoutes from '../src/routes/payments.js';
import reviewRoutes from '../src/routes/reviews.js';
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
  await fastify.register(orderRoutes, { prefix: '/api/v1/orders' });
  await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await fastify.register(reviewRoutes, { prefix: '/api/v1' });

  return fastify;
}

test('Sprint 5 Two-Way Ratings & Reviews Test Suite', async (t) => {
  const app = await buildApp();

  // Clean DB
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: { in: ['s5farmer@example.com', 's5buyer@example.com'] }
    }
  });

  let farmerToken = '';
  let buyerToken = '';
  let farmId = '';
  let productId = '';
  let orderId = '';

  await t.test('Setup Sprint 5 Accounts, Verified Farm & Completed Order', async () => {
    // 1. Create Farmer & Verified Farm
    const fRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Musa Kano',
        email: 's5farmer@example.com',
        phone: '+2348033334444',
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
        farm_name: 'Musa Organic Farm',
        state: 'Kano',
        city: 'Wudil',
        address: 'Wudil Sector 1'
      }
    });
    farmId = farmRes.json().farm.id;

    await prisma.farm.update({
      where: { id: farmId },
      data: { verification_status: 'verified' }
    });

    // 2. Add Product
    const pRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: {
        farm_id: farmId,
        name: 'Fresh Carrots',
        category: 'Vegetables',
        price: 5000,
        unit: 'Basket',
        quantity_available: 50
      }
    });
    productId = pRes.json().product.id;

    // 3. Create Buyer & Place Order
    const bRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Halima Sani',
        email: 's5buyer@example.com',
        phone: '+2348044445555',
        password: 'BuyerPassword123!',
        role: 'buyer'
      }
    });
    buyerToken = bRes.json().token;

    const oRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        items: [{ product_id: productId, quantity: 2 }],
        delivery_address: 'No 88 BUK Road',
        delivery_state: 'Kano',
        delivery_city: 'Kano'
      }
    });
    orderId = oRes.json().order.id;
  });

  await t.test('Test 1: Attempt review on PENDING order -> HTTP 400 Rejected (Rule #3)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/review`,
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: { rating: 5, comment: 'Great fresh produce!' }
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.json().message, 'Reviews are unlocked only after an order is completed.');
  });

  await t.test('Test 2: Complete order & submit review as buyer', async () => {
    // Manually transition order to completed for test
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'completed' }
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/review`,
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: { rating: 5, comment: 'Super fresh carrots, fast delivery!' }
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.review.rating, 5);
  });

  await t.test('Test 3: Submit duplicate review for same order -> HTTP 409 Conflict (Unique constraint)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/review`,
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: { rating: 4, comment: 'Duplicate review attempt' }
    });

    assert.equal(res.statusCode, 409);
  });

  await t.test('Test 4: Query farm public reviews & average rating score', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/farms/${farmId}/reviews`
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.average_rating, 5);
    assert.equal(body.total_reviews, 1);
  });

  await app.close();
});
