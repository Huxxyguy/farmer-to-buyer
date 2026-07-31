export async function processAutoReleaseEscrow(prisma, overrideHours = null) {
  const hours = overrideHours !== null ? overrideHours : Number(process.env.AUTO_RELEASE_HOURS || 168); // 168 hours = 7 days
  const thresholdDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Find fulfilled orders past threshold date with no open disputes
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: 'fulfilled',
      fulfilled_at: { lte: thresholdDate },
      disputes: {
        none: { status: 'open' }
      }
    },
    include: {
      orderItems: { include: { product: true } },
      payment: true
    }
  });

  let processedCount = 0;

  for (const order of pendingOrders) {
    const farmId = order.orderItems[0]?.product?.farm_id;

    // Transition order to completed
    await prisma.order.update({
      where: { id: order.id },
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
          description: `Automated 7-day escrow release payout for Order #${order.id.slice(0, 8)}`
        }
      });
    }

    processedCount++;
  }

  return { processedCount, orders: pendingOrders };
}

export function startAutoReleaseCron(prisma) {
  // Run interval check every 1 hour in background
  const INTERVAL_MS = 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const result = await processAutoReleaseEscrow(prisma);
      if (result.processedCount > 0) {
        console.log(`[AutoReleaseCron] Released escrow for ${result.processedCount} fulfilled orders.`);
      }
    } catch (err) {
      console.error('[AutoReleaseCron Error]:', err.message);
    }
  }, INTERVAL_MS);
}
