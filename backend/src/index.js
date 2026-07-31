import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import { requireAuth, requireRole } from './middleware/auth.js';

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: true
});

// Register Plugins
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

// Decorate Prisma instance
fastify.decorate('prisma', prisma);

// Decorate Auth Guards
fastify.decorate('authenticate', requireAuth);
fastify.decorate('requireRole', requireRole);

// Register API Routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

// Health check endpoint
fastify.get('/api/v1/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = process.env.PORT || 5000;
    await fastify.listen({ port: Number(port), host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { fastify, prisma };
