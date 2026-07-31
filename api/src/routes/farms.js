export default async function farmRoutes(fastify, options) {
  const prisma = fastify.prisma;

  const createFarmSchema = {
    body: {
      type: 'object',
      required: ['farm_name', 'state', 'city', 'address'],
      properties: {
        farm_name: { type: 'string', minLength: 2 },
        state: { type: 'string', minLength: 2 },
        city: { type: 'string', minLength: 2 },
        address: { type: 'string', minLength: 5 }
      }
    }
  };

  // 1. POST /api/v1/farms (Create Farm Profile)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['farmer'])],
    schema: createFarmSchema
  }, async (request, reply) => {
    const { farm_name, state, city, address } = request.body;
    const userId = request.user.id;

    // Check if farmer already has a farm storefront
    const existingFarm = await prisma.farm.findFirst({ where: { user_id: userId } });
    if (existingFarm) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'You have already registered a farm storefront.'
      });
    }

    // Check if farmer user profile is marked verified
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const initialStatus = user.verified ? 'verified' : 'pending';

    const farm = await prisma.farm.create({
      data: {
        user_id: userId,
        farm_name,
        state,
        city,
        address,
        verification_status: initialStatus
      }
    });

    return reply.status(201).send({
      statusCode: 201,
      message: 'Farm storefront created successfully',
      farm
    });
  });

  // 2. GET /api/v1/farms/my-farm (Farmer Dashboard View)
  fastify.get('/my-farm', {
    preHandler: [fastify.authenticate, fastify.requireRole(['farmer'])]
  }, async (request, reply) => {
    const farm = await prisma.farm.findFirst({
      where: { user_id: request.user.id },
      include: {
        products: {
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!farm) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No farm storefront found for this user.'
      });
    }

    return reply.send({
      statusCode: 200,
      farm
    });
  });

  // 3. GET /api/v1/farms (Public Verified Farms List)
  fastify.get('/', async (request, reply) => {
    const { state, city } = request.query;

    const whereClause = {
      verification_status: 'verified'
    };

    if (state) whereClause.state = { contains: state };
    if (city) whereClause.city = { contains: city };

    const farms = await prisma.farm.findMany({
      where: whereClause,
      select: {
        id: true,
        farm_name: true,
        state: true,
        city: true,
        address: true,
        verification_status: true,
        _count: {
          select: { products: true }
        }
      }
    });

    return reply.send({
      statusCode: 200,
      farms
    });
  });

  // 4. GET /api/v1/farms/:id (Public Farm Detail View)
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;

    const farm = await prisma.farm.findUnique({
      where: { id },
      include: {
        products: {
          where: { is_active: true }
        }
      }
    });

    if (!farm) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Farm not found.'
      });
    }

    return reply.send({ statusCode: 200, farm });
  });
}
