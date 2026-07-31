import { verifyPaystackSignature } from '../utils/paystack.js';

export default async function paymentRoutes(fastify, options) {
  const prisma = fastify.prisma;

  // Public Paystack Webhook Endpoint (Enforces Rule #6)
  fastify.post('/webhook', async (request, reply) => {
    const signature = request.headers['x-paystack-signature'];
    const payload = request.body;

    // Strict HMAC SHA512 Signature Verification
    const isValid = verifyPaystackSignature(payload, signature);
    if (!isValid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid Paystack webhook signature header.'
      });
    }

    const { event, data } = payload;

    if (event === 'charge.success') {
      const reference = data.reference;

      const payment = await prisma.payment.findUnique({
        where: { gateway_reference: reference }
      });

      if (payment) {
        // Update payment status to 'held' in platform escrow
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'held' }
        });

        // Update Order status to 'paid'
        await prisma.order.update({
          where: { id: payment.order_id },
          data: { status: 'paid' }
        });
      }
    }

    return reply.send({ statusCode: 200, status: 'received' });
  });
}
