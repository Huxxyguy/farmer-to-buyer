export default async function reviewRoutes(fastify, options) {
  const prisma = fastify.prisma;

  // Shared review creation handler
  const handleCreateReview = async (request, reply) => {
    const { id } = request.params;
    const { rating, comment } = request.body || {};

    if (!rating || rating < 1 || rating > 5) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Rating must be an integer between 1 and 5.'
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

    // Business Rule #3: Reviews locked exclusively to COMPLETED orders
    if (order.status !== 'completed') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Reviews are unlocked only after an order is completed.'
      });
    }

    const reviewerId = request.user.id;
    const isBuyer = order.buyer_id === reviewerId;

    // Resolve farmerUserId safely
    let farmerUserId = order.orderItems[0]?.product?.farm?.user_id;
    if (!farmerUserId && order.orderItems[0]?.product?.farm_id) {
      const farm = await prisma.farm.findUnique({
        where: { id: order.orderItems[0].product.farm_id }
      });
      if (farm) farmerUserId = farm.user_id;
    }

    const isFarmer = farmerUserId === reviewerId || request.user.role === 'farmer';

    if (!isBuyer && !isFarmer && request.user.role !== 'admin') {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not a participant in this order.'
      });
    }

    const revieweeId = isBuyer ? (farmerUserId || order.buyer_id) : order.buyer_id;

    // Check unique constraint (order_id, reviewer_id)
    const existingReview = await prisma.review.findUnique({
      where: {
        order_id_reviewer_id: {
          order_id: order.id,
          reviewer_id: reviewerId
        }
      }
    });

    if (existingReview) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'You have already posted a review for this order.'
      });
    }

    const review = await prisma.review.create({
      data: {
        order_id: order.id,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating: Number(rating),
        comment: comment || ''
      }
    });

    return reply.status(201).send({
      statusCode: 201,
      message: 'Review posted successfully',
      review
    });
  };

  // 1. POST /api/v1/orders/:id/review (Post Rating & Comment)
  fastify.post('/orders/:id/review', {
    preHandler: [fastify.authenticate]
  }, handleCreateReview);

  // 1b. POST /api/v1/reviews/orders/:id/review (Alias endpoint matching frontend API call)
  fastify.post('/reviews/orders/:id/review', {
    preHandler: [fastify.authenticate]
  }, handleCreateReview);

  // Shared farm reviews query handler
  const handleGetFarmReviews = async (request, reply) => {
    const { id } = request.params;

    const farm = await prisma.farm.findUnique({ where: { id } });
    if (!farm) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Farm not found.'
      });
    }

    // Get all reviews where reviewee is the farm owner user
    const reviews = await prisma.review.findMany({
      where: { reviewee_id: farm.user_id },
      include: {
        reviewer: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const avgResult = await prisma.review.aggregate({
      where: { reviewee_id: farm.user_id },
      _avg: { rating: true },
      _count: { rating: true }
    });

    const average_rating = avgResult._avg.rating ? Number(avgResult._avg.rating.toFixed(1)) : 0;
    const total_reviews = avgResult._count.rating || 0;

    return reply.send({
      statusCode: 200,
      average_rating,
      total_reviews,
      reviews
    });
  };

  // 2. GET /api/v1/farms/:id/reviews (Public Farm Reviews & Average Rating)
  fastify.get('/farms/:id/reviews', handleGetFarmReviews);

  // 2b. GET /api/v1/reviews/farms/:id/reviews (Alias endpoint matching frontend API call)
  fastify.get('/reviews/farms/:id/reviews', handleGetFarmReviews);
}
