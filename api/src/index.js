import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import farmRoutes from './routes/farms.js';
import productRoutes from './routes/products.js';
import uploadRoutes from './routes/uploads.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import disputeRoutes from './routes/disputes.js';
import reviewRoutes from './routes/reviews.js';

import { requireAuth, requireRole } from './middleware/auth.js';

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(cookie);

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'super-secret-key-farmer-marketplace-2026',
  cookie: {
    cookieName: 'token',
    signed: false
  }
});

await fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

await fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/'
});

fastify.decorate('prisma', prisma);
fastify.decorate('authenticate', requireAuth);
fastify.decorate('requireRole', requireRole);

// Register API Routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(farmRoutes, { prefix: '/api/v1/farms' });
await fastify.register(productRoutes, { prefix: '/api/v1/products' });
await fastify.register(uploadRoutes, { prefix: '/api/v1/uploads' });
await fastify.register(orderRoutes, { prefix: '/api/v1/orders' });
await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' });
await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
await fastify.register(disputeRoutes, { prefix: '/api/v1' });
await fastify.register(reviewRoutes, { prefix: '/api/v1' });

fastify.get('/api/v1/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = process.env.PORT || 5000;
    await fastify.listen({ port: Number(port), host: '0.0.0.0' });
    console.log(`Fastify API Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { fastify, prisma };
