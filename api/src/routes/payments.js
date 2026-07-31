import { verifyPaystackSignature } from '../utils/paystack.js';

export default async function paymentRoutes(fastify, options) {
  const prisma = fastify.prisma;

  // POST /api/v1/payments/webhook (Public Paystack Signature Verified Webhook)
  fastify.post('/webhook', async (request, reply) => {
    const signature = request.headers['x-paystack-signature'];
    const payload = request.body;

    // Enforce Rule #6: Verify Paystack HMAC SHA512 signature
    const isValid = verifyPaystackSignature(payload, signature);
    if (!isValid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid Paystack webhook signature.'
      });
    }

    const { event, data } = payload;

    if (event === 'charge.success') {
      const reference = data.reference;

      const payment = await prisma.payment.findUnique({
        where: { gateway_reference: reference },
        include: {
          order: {
            include: { orderItems: true }
          }
        }
      });

      if (payment) {
        // Update payment & order status
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'held' }
        });

        await prisma.order.update({
          where: { id: payment.order_id },
          data: { status: 'paid' }
        });

        // Fix A2: Decrement product stock ONLY ONCE when payment is confirmed
        if (payment.order && payment.order.orderItems) {
          for (const item of payment.order.orderItems) {
            await prisma.product.update({
              where: { id: item.product_id },
              data: {
                quantity_available: {
                  decrement: item.quantity
                }
              }
            });
          }
        }
      }
    }

    return reply.send({ statusCode: 200, status: 'success' });
  });
}
