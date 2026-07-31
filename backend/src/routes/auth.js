import { hashPassword, comparePassword } from '../utils/hash.js';

export default async function authRoutes(fastify, options) {
  const prisma = fastify.prisma;

  // JSON Schemas
  const registerSchema = {
    body: {
      type: 'object',
      required: ['name', 'email', 'phone', 'password', 'role'],
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', minLength: 10 },
        password: { type: 'string', minLength: 6 },
        role: { type: 'string', enum: ['farmer', 'buyer'] }
      }
    }
  };

  const loginSchema = {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' }
      }
    }
  };

  // 1. POST /api/v1/auth/register
  fastify.post('/register', { schema: registerSchema }, async (request, reply) => {
    const { name, email, phone, password, role } = request.body;

    // Check if role is admin (Schema already restricts to farmer/buyer, but explicit safeguard)
    if (role === 'admin') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Public registration for admin accounts is strictly prohibited.'
      });
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'An account with this email address already exists.'
      });
    }

    const password_hash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password_hash,
        role,
        verified: false
      }
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: false, // Set to true in production HTTPS
      sameSite: 'lax'
    });

    return reply.status(201).send({
      statusCode: 201,
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        created_at: user.created_at
      },
      token
    });
  });

  // 2. POST /api/v1/auth/login
  fastify.post('/login', { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    return reply.send({
      statusCode: 200,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        created_at: user.created_at
      },
      token
    });
  });

  // 3. GET /api/v1/auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id }
    });

    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User profile not found.'
      });
    }

    return reply.send({
      statusCode: 200,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        created_at: user.created_at
      }
    });
  });

  // 4. POST /api/v1/auth/logout
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return reply.send({
      statusCode: 200,
      message: 'Logged out successfully'
    });
  });

  // Test endpoints for Sprint 1 Role Guards
  fastify.get('/farmer-only', { preHandler: [fastify.authenticate, fastify.requireRole(['farmer'])] }, async (request, reply) => {
    return reply.send({ message: 'Welcome to the Farmer restricted area!' });
  });

  fastify.get('/admin-only', { preHandler: [fastify.authenticate, fastify.requireRole(['admin'])] }, async (request, reply) => {
    return reply.send({ message: 'Welcome to the Admin restricted area!' });
  });

  fastify.get('/buyer-only', { preHandler: [fastify.authenticate, fastify.requireRole(['buyer'])] }, async (request, reply) => {
    return reply.send({ message: 'Welcome to the Buyer restricted area!' });
  });
}
