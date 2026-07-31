export default async function productRoutes(fastify, options) {
  const prisma = fastify.prisma;

  const createProductSchema = {
    body: {
      type: 'object',
      required: ['farm_id', 'name', 'category', 'price', 'unit', 'quantity_available'],
      properties: {
        farm_id: { type: 'string' },
        name: { type: 'string', minLength: 2 },
        category: { type: 'string' },
        price: { type: 'number', minimum: 0 },
        unit: { type: 'string' },
        quantity_available: { type: 'integer', minimum: 0 },
        photo_url: { type: 'string' }
      }
    }
  };

  // 1. POST /api/v1/products (Create Produce Listing)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['farmer'])],
    schema: createProductSchema
  }, async (request, reply) => {
    const { farm_id, name, category, price, unit, quantity_available, photo_url } = request.body;

    // Verify farmer owns this farm
    const farm = await prisma.farm.findUnique({ where: { id: farm_id } });
    if (!farm) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Specified farm does not exist.'
      });
    }

    if (farm.user_id !== request.user.id) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not authorized to post products for this farm.'
      });
    }

    const product = await prisma.product.create({
      data: {
        farm_id,
        name,
        category,
        price: Number(price),
        unit,
        quantity_available: Number(quantity_available),
        photo_url: photo_url || null,
        is_active: true
      }
    });

    return reply.status(201).send({
      statusCode: 201,
      message: 'Product listing created successfully',
      product
    });
  });

  // 2. GET /api/v1/products (Public Marketplace Search Engine - Rule #2 Enforced)
  fastify.get('/', async (request, reply) => {
    const { state, city, category, search, min_price, max_price } = request.query;

    // Strictly enforce Business Rule #2: Only active products from VERIFIED farms with stock > 0
    const whereClause = {
      is_active: true,
      quantity_available: { gt: 0 },
      farm: {
        verification_status: 'verified'
      }
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.name = { contains: search };
    }

    if (min_price || max_price) {
      whereClause.price = {};
      if (min_price) whereClause.price.gte = Number(min_price);
      if (max_price) whereClause.price.lte = Number(max_price);
    }

    if (state || city) {
      const farmFilter = { verification_status: 'verified' };
      if (state) farmFilter.state = { contains: state };
      if (city) farmFilter.city = { contains: city };
      whereClause.farm = farmFilter;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        farm: {
          select: {
            id: true,
            farm_name: true,
            state: true,
            city: true,
            address: true,
            verification_status: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return reply.send({
      statusCode: 200,
      count: products.length,
      products
    });
  });

  // 3. GET /api/v1/products/:id (Public Single Produce Detail)
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        farm: {
          select: {
            id: true,
            farm_name: true,
            state: true,
            city: true,
            address: true,
            verification_status: true
          }
        }
      }
    });

    if (!product) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product listing not found.'
      });
    }

    return reply.send({ statusCode: 200, product });
  });

  // 4. PATCH /api/v1/products/:id (Farmer Edit Listing)
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['farmer'])]
  }, async (request, reply) => {
    const { id } = request.params;
    const { price, unit, quantity_available, photo_url, name, category } = request.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { farm: true }
    });

    if (!existingProduct) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product listing not found.'
      });
    }

    if (existingProduct.farm.user_id !== request.user.id) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not authorized to edit this produce listing.'
      });
    }

    const updateData = {};
    if (price !== undefined) updateData.price = Number(price);
    if (unit !== undefined) updateData.unit = unit;
    if (quantity_available !== undefined) updateData.quantity_available = Number(quantity_available);
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData
    });

    return reply.send({
      statusCode: 200,
      message: 'Product listing updated successfully',
      product: updatedProduct
    });
  });

  // 5. PATCH /api/v1/products/:id/status (Toggle Listing Active State)
  fastify.patch('/:id/status', {
    preHandler: [fastify.authenticate, fastify.requireRole(['farmer'])]
  }, async (request, reply) => {
    const { id } = request.params;
    const { is_active } = request.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { farm: true }
    });

    if (!existingProduct) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product listing not found.'
      });
    }

    if (existingProduct.farm.user_id !== request.user.id) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not authorized to modify this listing status.'
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { is_active: Boolean(is_active) }
    });

    return reply.send({
      statusCode: 200,
      message: `Product ${updatedProduct.is_active ? 'activated' : 'deactivated'} successfully`,
      product: updatedProduct
    });
  });
}
