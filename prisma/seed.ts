import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHashJohn = await bcrypt.hash('password123', 10);
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);

  const user1 = await prisma.user.upsert({
    where: { userId: 'john123' },
    update: {
      passwordHash: passwordHashJohn,
      name: 'John Doe',
      role: Role.USER,
    },
    create: {
      userId: 'john123',
      name: 'John Doe',
      passwordHash: passwordHashJohn,
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { userId: 'admin' },
    update: {
      passwordHash: passwordHashAdmin,
      name: 'Administrator',
      role: Role.ADMIN,
    },
    create: {
      userId: 'admin',
      name: 'Administrator',
      passwordHash: passwordHashAdmin,
      role: Role.ADMIN,
    },
  });

  console.log('Database seeded successfully:');
  console.log(`- User: ${user1.name} (${user1.userId}) - Role: ${user1.role} - Password: password123`);
  console.log(`- User: ${user2.name} (${user2.userId}) - Role: ${user2.role} - Password: admin123`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
