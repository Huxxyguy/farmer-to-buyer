import { initializePaystackTransaction } from '../utils/paystack.js';

export default async function orderRoutes(fastify, options) {
  const prisma = fastify.prisma;

  const createOrderSchema = {
    body: {
      type: 'object',
      required: ['items', 'delivery_address', 'delivery_state', 'delivery_city'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['product_id', 'quantity'],
            properties: {
              product_id: { type: 'string' },
              quantity: { type: 'integer', minimum: 1 }
            }
          }
        },
        delivery_address: { type: 'string', minLength: 5 },
        delivery_state: { type: 'string', minLength: 2 },
        delivery_city: { type: 'string', minLength: 2 }
      }
    }
  };

  // 1. POST /api/v1/orders (Place Order & Snapshot Pricing - READ-ONLY stock check, NO DECREMENT)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['buyer'])],
    schema: createOrderSchema
  }, async (request, reply) => {
    const { items, delivery_address, delivery_state, delivery_city } = request.body;
    const buyerId = request.user.id;

    let totalAmount = 0;
    const orderItemDataList = [];

    // Read-only validation of stock & price snapshot (Fix A2: No stock decrement at checkout creation)
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.product_id },
        include: { farm: true }
      });

      if (!product || !product.is_active) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Product ${item.product_id} is not available.`
        });
      }

      if (product.quantity_available < item.quantity) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Insufficient stock for product ${product.name}. Requested: ${item.quantity}, Available: ${product.quantity_available}`
        });
      }

      const lineTotal = product.price * item.quantity;
      totalAmount += lineTotal;

      // Historical Price Snapshot
      orderItemDataList.push({
        product_id: product.id,
        quantity: item.quantity,
        price_at_purchase: product.price
      });
      // Fix A2: Stock is NOT decremented here. It will be decremented upon payment confirmation in webhook.
    }

    // Create Order & OrderItems
    const order = await prisma.order.create({
      data: {
        buyer_id: buyerId,
        status: 'pending',
        total_amount: totalAmount,
        delivery_address,
        delivery_state,
        delivery_city,
        orderItems: {
          create: orderItemDataList
        }
      },
      include: {
        orderItems: {
          include: { product: true }
        }
      }
    });

    return reply.status(201).send({
      statusCode: 201,
      message: 'Order created successfully. Ready for payment.',
      order
    });
  });

  // 2. POST /api/v1/orders/:id/pay (Initialize Paystack Checkout)
  fastify.post('/:id/pay', {
    preHandler: [fastify.authenticate, fastify.requireRole(['buyer'])]
  }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { buyer: true }
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order not found.'
      });
    }

    if (order.buyer_id !== request.user.id) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not authorized to pay for this order.'
      });
    }

    const reference = `FMB-PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let paystackResult;
    try {
      paystackResult = await initializePaystackTransaction({
        email: order.buyer.email,
        amount: order.total_amount,
        reference
      });
    } catch (err) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Payment Error',
        message: err.message
      });
    }

    await prisma.payment.upsert({
      where: { order_id: order.id },
      create: {
        order_id: order.id,
        amount: order.total_amount,
        status: 'held',
        gateway_reference: reference
      },
      update: {
        gateway_reference: reference,
        amount: order.total_amount
      }
    });

    return reply.send({
      statusCode: 200,
      authorization_url: paystackResult.authorization_url,
      reference
    });
  });

  // 3. GET /api/v1/orders/my-orders
  fastify.get('/my-orders', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userRole = request.user.role;
    const userId = request.user.id;

    let orders = [];

    if (userRole === 'buyer') {
      orders = await prisma.order.findMany({
        where: { buyer_id: userId },
        include: {
          orderItems: { include: { product: true } },
          payment: true
        },
        orderBy: { created_at: 'desc' }
      });
    } else if (userRole === 'farmer') {
      const farm = await prisma.farm.findFirst({ where: { user_id: userId } });
      if (farm) {
        orders = await prisma.order.findMany({
          where: {
            orderItems: {
              some: {
                product: { farm_id: farm.id }
              }
            }
          },
          include: {
            buyer: { select: { id: true, name: true, phone: true } },
            orderItems: { include: { product: true } },
            payment: true
          },
          orderBy: { created_at: 'desc' }
        });
      }
    }

    return reply.send({ statusCode: 200, count: orders.length, orders });
  });

  // 4. GET /api/v1/orders/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        orderItems: { include: { product: true } },
        payment: true,
        disputes: true
      }
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order not found.'
      });
    }

    return reply.send({ statusCode: 200, order });
  });

  // 5. PATCH /api/v1/orders/:id/fulfill
  fastify.patch('/:id/fulfill', {
    preHandler: [fastify.authenticate, fastify.requireRole(['farmer'])]
  }, async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order not found.'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'fulfilled',
        fulfilled_at: new Date()
      }
    });

    return reply.send({
      statusCode: 200,
      message: 'Order marked as fulfilled/dispatched',
      order: updatedOrder
    });
  });

  // 6. POST /api/v1/orders/:id/confirm
  fastify.post('/:id/confirm', {
    preHandler: [fastify.authenticate, fastify.requireRole(['buyer'])]
  }, async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: { include: { product: true } },
        payment: true
      }
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order not found.'
      });
    }

    if (order.buyer_id !== request.user.id) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not authorized to confirm this order.'
      });
    }

    if (order.status !== 'fulfilled') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Order must be in fulfilled status before confirming receipt.'
      });
    }

    const farmId = order.orderItems[0]?.product?.farm_id;
    if (!farmId) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Error',
        message: 'Associated farm not found.'
      });
    }

    const completedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'completed' }
    });

    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'released',
          escrow_released_at: new Date()
        }
      });
    }

    const updatedFarm = await prisma.farm.update({
      where: { id: farmId },
      data: { balance: { increment: order.total_amount } }
    });

    await prisma.transaction.create({
      data: {
        farm_id: farmId,
        order_id: order.id,
        amount: order.total_amount,
        type: 'credit',
        description: `Escrow release payout for Order #${order.id.slice(0, 8)}`
      }
    });

    return reply.send({
      statusCode: 200,
      message: 'Receipt confirmed and escrow payment released to farmer',
      order: completedOrder,
      farm_balance: updatedFarm.balance
    });
  });
}
