import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database state...');

  // Clean existing data
  await prisma.dispute.deleteMany();
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();

  const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);
  const hashedFarmerPassword = await bcrypt.hash('Farmer123!', 10);
  const hashedBuyerPassword = await bcrypt.hash('Buyer123!', 10);

  // 1. Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@marketplace.ng',
      phone: '+2348000000001',
      password_hash: hashedAdminPassword,
      role: 'admin',
      verified: true,
    },
  });

  // 2. Create Farmer User & Farm Storefront
  const farmer = await prisma.user.create({
    data: {
      name: 'Aminu Ibrahim',
      email: 'farmer@marketplace.ng',
      phone: '+2348022222222',
      password_hash: hashedFarmerPassword,
      role: 'farmer',
      verified: true,
    },
  });

  const farm = await prisma.farm.create({
    data: {
      user_id: farmer.id,
      farm_name: 'Aminu Organic Farms',
      state: 'Kano',
      city: 'Wudil',
      address: 'Plot 14, Kano-Wudil Express Road',
      verification_status: 'verified',
      verified_by: admin.id,
      verified_at: new Date(),
    },
  });

  // 3. Create Buyer User
  const buyer = await prisma.user.create({
    data: {
      name: 'Fatima Suleiman',
      email: 'buyer@marketplace.ng',
      phone: '+2348033333333',
      password_hash: hashedBuyerPassword,
      role: 'buyer',
      verified: true,
    },
  });

  console.log('Seed completed successfully!');
  console.log({ admin: admin.email, farmer: farmer.email, buyer: buyer.email, farm: farm.farm_name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
