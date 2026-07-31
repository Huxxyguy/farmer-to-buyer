export default async function disputeRoutes(fastify, options) {
  const prisma = fastify.prisma;

  // POST /api/v1/orders/:id/dispute (Open Dispute on Order)
  fastify.post('/orders/:id/dispute', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;

    if (!reason || reason.trim().length < 5) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dispute reason must be at least 5 characters long.'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: { include: { product: { include: { farm: true } } } }
      }
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order not found.'
      });
    }

    const userId = request.user.id;
    const isBuyer = order.buyer_id === userId;
    const farmUserId = order.orderItems[0]?.product?.farm?.user_id;
    const isFarmer = farmUserId === userId;

    if (!isBuyer && !isFarmer && request.user.role !== 'admin') {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not authorized to raise a dispute on this order.'
      });
    }

    // Create Dispute record
    const dispute = await prisma.dispute.create({
      data: {
        order_id: order.id,
        raised_by: userId,
        reason,
        status: 'open'
      }
    });

    // Freeze Order status to 'disputed'
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'disputed' }
    });

    return reply.status(201).send({
      statusCode: 201,
      message: 'Dispute opened successfully. Escrow funds remain frozen awaiting admin review.',
      dispute
    });
  });
}
