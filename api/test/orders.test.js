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
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import { processAutoReleaseEscrow } from '../src/services/cron.js';
import { generatePaystackSignature } from '../src/utils/paystack.js';
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

  return fastify;
}

test('Sprint 3 Orders, Payments & Escrow Engine Test Suite', async (t) => {
  const app = await buildApp();

  // Clean DB
  await prisma.review.deleteMany();
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
        in: ['o3farmer@example.com', 'o3buyer@example.com', 'o3other@example.com']
      }
    }
  });

  let farmerToken = '';
  let buyerToken = '';
  let otherToken = '';
  let farmerId = '';
  let farmId = '';
  let productId = '';
  let orderId = '';
  let gatewayReference = '';

  await t.test('Setup Sprint 3 Test Accounts & Verified Farm', async () => {
    // 1. Register Farmer & Farm
    const fRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Kabiru Sani',
        email: 'o3farmer@example.com',
        phone: '+2348030001111',
        password: 'FarmerPassword123!',
        role: 'farmer'
      }
    });
    farmerToken = fRes.json().token;
    farmerId = fRes.json().user.id;

    const farmRes = await app.inject({
      method: 'POST',
      url: '/api/v1/farms',
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: {
        farm_name: 'Kano Tomato Hub',
        state: 'Kano',
        city: 'Wudil',
        address: 'Wudil Market Road'
      }
    });
    farmId = farmRes.json().farm.id;

    // Admin verifies farm directly
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
        name: 'Fresh Tomatoes',
        category: 'Vegetables',
        price: 15000,
        unit: 'Basket',
        quantity_available: 20
      }
    });
    productId = pRes.json().product.id;

    // 3. Register Buyer
    const bRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Fatima Bello',
        email: 'o3buyer@example.com',
        phone: '+2348040002222',
        password: 'BuyerPassword123!',
        role: 'buyer'
      }
    });
    buyerToken = bRes.json().token;

    // 4. Register Unauthorized Buyer
    const oRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Other Buyer',
        email: 'o3other@example.com',
        phone: '+2348050003333',
        password: 'OtherPassword123!',
        role: 'buyer'
      }
    });
    otherToken = oRes.json().token;
  });

  await t.test('Test A2.1: Buyer creates order -> Stock UNCHANGED on un-paid order (Fix A2)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        items: [{ product_id: productId, quantity: 2 }],
        delivery_address: 'No 45 Zoo Road',
        delivery_state: 'Kano',
        delivery_city: 'Kano City'
      }
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    orderId = body.order.id;
    assert.equal(body.order.total_amount, 30000);
    assert.equal(body.order.orderItems[0].price_at_purchase, 15000);

    // Fix A2: Confirm stock remains 20 (UNCHANGED on order creation)
    const productInDb = await prisma.product.findUnique({ where: { id: productId } });
    assert.equal(productInDb.quantity_available, 20);
  });

  await t.test('Test A2.3: Attempt to order more than quantity_available -> Rejected at order-creation time', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        items: [{ product_id: productId, quantity: 50 }], // Only 20 available
        delivery_address: 'No 45 Zoo Road',
        delivery_state: 'Kano',
        delivery_city: 'Kano City'
      }
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, 'Bad Request');
  });

  await t.test('Test 2: Price modification on product does NOT alter historical order total', async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { price: 20000 }
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}`,
      headers: { authorization: `Bearer ${buyerToken}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.order.total_amount, 30000);
    assert.equal(body.order.orderItems[0].price_at_purchase, 15000);
  });

  await t.test('Test 3: Buyer initiates payment (POST /orders/:id/pay)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pay`,
      headers: { authorization: `Bearer ${buyerToken}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.authorization_url);
    assert.ok(body.reference);
    gatewayReference = body.reference;
  });

  await t.test('Test A2.2: Paystack webhook called with VALID HMAC signature -> Stock DECREMENTS EXACTLY ONCE (Fix A2)', async () => {
    const payload = {
      event: 'charge.success',
      data: { reference: gatewayReference, amount: 3000000 }
    };

    const validSignature = generatePaystackSignature(payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: { 'x-paystack-signature': validSignature },
      payload
    });

    assert.equal(res.statusCode, 200);

    const orderInDb = await prisma.order.findUnique({ where: { id: orderId } });
    assert.equal(orderInDb.status, 'paid');

    const paymentInDb = await prisma.payment.findUnique({ where: { order_id: orderId } });
    assert.equal(paymentInDb.status, 'held');

    // Fix A2: Confirm product stock decremented from 20 to 18 (2 units purchased)
    const productInDb = await prisma.product.findUnique({ where: { id: productId } });
    assert.equal(productInDb.quantity_available, 18);
  });

  await t.test('Test 6: Farmer marks order fulfilled (PATCH /orders/:id/fulfill)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${orderId}/fulfill`,
      headers: { authorization: `Bearer ${farmerToken}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().order.status, 'fulfilled');
    assert.ok(res.json().order.fulfilled_at);
  });

  await t.test('Test A3: FR-5.4 7-day Escrow Auto-Release Cron Service Execution', async () => {
    // Execute auto-release with 0 hours threshold (simulating past 7 days)
    const result = await processAutoReleaseEscrow(prisma, 0);

    assert.equal(result.processedCount, 1);

    const orderInDb = await prisma.order.findUnique({ where: { id: orderId } });
    assert.equal(orderInDb.status, 'completed');

    const paymentInDb = await prisma.payment.findUnique({ where: { order_id: orderId } });
    assert.equal(paymentInDb.status, 'released');

    const farmInDb = await prisma.farm.findUnique({ where: { id: farmId } });
    assert.equal(farmInDb.balance, 30000);
  });

  await t.test('Test 8: Unauthorized non-buyer attempts confirm receipt -> HTTP 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/confirm`,
      headers: { authorization: `Bearer ${otherToken}` }
    });

    assert.equal(res.statusCode, 403);
  });

  await app.close();
});
