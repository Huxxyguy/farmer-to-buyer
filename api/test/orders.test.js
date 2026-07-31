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

import authRoutes from '../src/routes/auth.js';
import farmRoutes from '../src/routes/farms.js';
import productRoutes from '../src/routes/products.js';
import orderRoutes from '../src/routes/orders.js';
import paymentRoutes from '../src/routes/payments.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import { generatePaystackSignature } from '../src/utils/paystack.js';

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

  return fastify;
}

test('Sprint 3 Orders, Payments & Escrow Engine Test Suite', async (t) => {
  const app = await buildApp();

  // Clean test DB records
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['s3farmer@example.com', 's3buyer@example.com']
      }
    }
  });

  let farmerToken = '';
  let buyerToken = '';
  let farmerId = '';
  let buyerId = '';
  let farmId = '';
  let productId = '';
  let orderId = '';
  let gatewayRef = '';

  await t.test('Setup Sprint 3 Test Accounts & Verified Farm', async () => {
    // 1. Create Farmer & Verified Farm
    const fRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Kabiru Sani',
        email: 's3farmer@example.com',
        phone: '+2348011223344',
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
        farm_name: 'Kabiru Tomato Farm',
        state: 'Kano',
        city: 'Wudil',
        address: 'Wudil Farm Estate'
      }
    });
    farmId = farmRes.json().farm.id;

    // Verify Farm
    await prisma.farm.update({
      where: { id: farmId },
      data: { verification_status: 'verified' }
    });

    // Create Produce Listing (Tomatoes, 100 baskets @ 15,000 NGN)
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
        quantity_available: 100
      }
    });
    productId = pRes.json().product.id;

    // 2. Create Buyer Account
    const bRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Hadiza Adamu',
        email: 's3buyer@example.com',
        phone: '+2348099887766',
        password: 'BuyerPassword123!',
        role: 'buyer'
      }
    });
    buyerToken = bRes.json().token;
    buyerId = bRes.json().user.id;
  });

  await t.test('Test 1: Buyer places order & snapshots price_at_purchase', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        items: [{ product_id: productId, quantity: 2 }],
        delivery_address: 'No 45 Zoo Road',
        delivery_state: 'Kano',
        delivery_city: 'Kano Municipal'
      }
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.order.status, 'pending');
    assert.equal(body.order.total_amount, 30000);
    assert.equal(body.order.orderItems[0].price_at_purchase, 15000);
    orderId = body.order.id;

    // Stock should be decremented from 100 to 98
    const updatedProd = await prisma.product.findUnique({ where: { id: productId } });
    assert.equal(updatedProd.quantity_available, 98);
  });

  await t.test('Test 2: Price modification on product does NOT alter historical order total', async () => {
    // Farmer updates product price to 20,000 NGN
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${productId}`,
      headers: { authorization: `Bearer ${farmerToken}` },
      payload: { price: 20000 }
    });

    // Check previously created order
    const orderInDb = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true }
    });

    assert.equal(orderInDb.total_amount, 30000);
    assert.equal(orderInDb.orderItems[0].price_at_purchase, 15000);
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
    gatewayRef = body.reference;
  });

  await t.test('Test 4: Paystack webhook called with INVALID signature -> HTTP 401 Rejected (Rule #6)', async () => {
    const payload = {
      event: 'charge.success',
      data: { reference: gatewayRef }
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: {
        'x-paystack-signature': 'invalid_forged_signature_12345'
      },
      payload
    });

    assert.equal(res.statusCode, 401);
  });

  await t.test('Test 5: Paystack webhook called with VALID HMAC signature -> Order paid, escrow held', async () => {
    const payload = {
      event: 'charge.success',
      data: { reference: gatewayRef }
    };

    const validSig = generatePaystackSignature(payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: {
        'x-paystack-signature': validSig
      },
      payload
    });

    assert.equal(res.statusCode, 200);

    const orderInDb = await prisma.order.findUnique({ where: { id: orderId } });
    assert.equal(orderInDb.status, 'paid');

    const paymentInDb = await prisma.payment.findUnique({ where: { gateway_reference: gatewayRef } });
    assert.equal(paymentInDb.status, 'held');
  });

  await t.test('Test 6: Farmer marks order fulfilled (PATCH /orders/:id/fulfill)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${orderId}/fulfill`,
      headers: { authorization: `Bearer ${farmerToken}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.order.status, 'fulfilled');
    assert.ok(body.order.fulfilled_at);
  });

  await t.test('Test 7: Buyer confirms receipt -> Single-click escrow release & farmer ledger credit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/confirm`,
      headers: { authorization: `Bearer ${buyerToken}` }
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.order.status, 'completed');
    assert.equal(body.farm_balance, 30000);

    // Verify Payment Escrow status is 'released'
    const paymentInDb = await prisma.payment.findUnique({ where: { order_id: orderId } });
    assert.equal(paymentInDb.status, 'released');

    // Verify Transaction Ledger record
    const txn = await prisma.transaction.findFirst({ where: { order_id: orderId } });
    assert.ok(txn);
    assert.equal(txn.amount, 30000);
    assert.equal(txn.type, 'credit');
  });

  await t.test('Test 8: Unauthorized non-buyer attempts confirm receipt -> HTTP 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/confirm`,
      headers: { authorization: `Bearer ${farmerToken}` }
    });

    assert.equal(res.statusCode, 403);
  });

  await app.close();
});
