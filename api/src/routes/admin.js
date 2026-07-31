export default async function adminRoutes(fastify, options) {
  const prisma = fastify.prisma;

  // 1. GET /api/v1/admin/farms/pending (List Pending Farm Verification Queue)
  fastify.get('/farms/pending', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])]
  }, async (request, reply) => {
    const pendingFarms = await prisma.farm.findMany({
      where: { verification_status: 'pending' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } }
      },
      orderBy: { farm_name: 'asc' }
    });

    return reply.send({
      statusCode: 200,
      count: pendingFarms.length,
      farms: pendingFarms
    });
  });

  // 2. POST /api/v1/admin/farms/:id/verify (Verify or Reject Farm Storefront)
  fastify.post('/farms/:id/verify', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])]
  }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body; // "verified" | "rejected"

    if (!['verified', 'rejected'].includes(status)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Status must be either "verified" or "rejected".'
      });
    }

    const farm = await prisma.farm.findUnique({ where: { id } });
    if (!farm) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Farm not found.'
      });
    }

    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        verification_status: status,
        verified_by: request.user.id,
        verified_at: new Date()
      }
    });

    return reply.send({
      statusCode: 200,
      message: `Farm storefront status updated to ${status}`,
      farm: updatedFarm
    });
  });

  // 3. GET /api/v1/admin/disputes (List Open Disputes Queue)
  fastify.get('/disputes', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])]
  }, async (request, reply) => {
    const disputes = await prisma.dispute.findMany({
      where: { status: 'open' },
      include: {
        order: {
          include: {
            buyer: { select: { id: true, name: true, email: true, phone: true } },
            payment: true,
            orderItems: { include: { product: true } }
          }
        },
        userRaised: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { id: 'desc' }
    });

    return reply.send({
      statusCode: 200,
      count: disputes.length,
      disputes
    });
  });

  // 4. POST /api/v1/admin/disputes/:id/resolve (Resolve Dispute - Refund or Release)
  fastify.post('/disputes/:id/resolve', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])]
  }, async (request, reply) => {
    const { id } = request.params;
    const { resolution } = request.body; // "resolved_refund" | "resolved_release"

    if (!['resolved_refund', 'resolved_release'].includes(resolution)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Resolution must be "resolved_refund" or "resolved_release".'
      });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            orderItems: { include: { product: true } },
            payment: true
          }
        }
      }
    });

    if (!dispute) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Dispute not found.'
      });
    }

    const adminId = request.user.id;
    const order = dispute.order;
    const farmId = order.orderItems[0]?.product?.farm_id;

    if (resolution === 'resolved_refund') {
      // Refund Buyer
      await prisma.dispute.update({
        where: { id },
        data: {
          status: 'resolved_refund',
          resolved_by: adminId,
          resolved_at: new Date()
        }
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: 'refunded' }
        });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'completed' }
      });

      return reply.send({
        statusCode: 200,
        message: 'Dispute resolved. Payment refunded to buyer.'
      });
    } else {
      // Release Escrow to Farmer
      await prisma.dispute.update({
        where: { id },
        data: {
          status: 'resolved_release',
          resolved_by: adminId,
          resolved_at: new Date()
        }
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

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'completed' }
      });

      if (farmId) {
        await prisma.farm.update({
          where: { id: farmId },
          data: { balance: { increment: order.total_amount } }
        });

        await prisma.transaction.create({
          data: {
            farm_id: farmId,
            order_id: order.id,
            amount: order.total_amount,
            type: 'credit',
            description: `Admin dispute resolution payout for Order #${order.id.slice(0, 8)}`
          }
        });
      }

      return reply.send({
        statusCode: 200,
        message: 'Dispute resolved. Escrow payment released to farmer balance.'
      });
    }
  });

  // 5. GET /api/v1/admin/analytics (Platform Governance Metrics Summary)
  fastify.get('/analytics', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])]
  }, async (request, reply) => {
    const totalUsers = await prisma.user.count();
    const verifiedFarms = await prisma.farm.count({ where: { verification_status: 'verified' } });
    const pendingFarms = await prisma.farm.count({ where: { verification_status: 'pending' } });
    const completedOrders = await prisma.order.count({ where: { status: 'completed' } });
    const openDisputes = await prisma.dispute.count({ where: { status: 'open' } });

    const totalVolumeResult = await prisma.order.aggregate({
      where: { status: { in: ['paid', 'fulfilled', 'completed'] } },
      _sum: { total_amount: true }
    });

    const totalVolume = totalVolumeResult._sum.total_amount || 0;

    return reply.send({
      statusCode: 200,
      analytics: {
        totalUsers,
        verifiedFarms,
        pendingFarms,
        completedOrders,
        openDisputes,
        totalVolume
      }
    });
  });
}
