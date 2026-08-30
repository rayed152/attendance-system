import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Multi-Tenant database...');

  const passwordHashJohn = await bcrypt.hash('password123', 10);
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashJane = await bcrypt.hash('password123', 10);

  // Seed Acme Corporation (Verified)
  const acmeOrg = await prisma.organization.upsert({
    where: { companyCode: 'acme' },
    update: {
      name: 'Acme Corporation',
      licenseKey: 'ACME-2026-KEY',
      isVerified: true,
    },
    create: {
      name: 'Acme Corporation',
      companyCode: 'acme',
      licenseKey: 'ACME-2026-KEY',
      isVerified: true,
    },
  });

  // Seed Acme SystemConfig
  await prisma.systemConfig.upsert({
    where: { organizationId: acmeOrg.id },
    update: { lateEntryTime: '09:00', earlyExitTime: '17:00' },
    create: { organizationId: acmeOrg.id, lateEntryTime: '09:00', earlyExitTime: '17:00' },
  });

  // Seed Acme Users
  const user1 = await prisma.user.upsert({
    where: {
      organizationId_userId: {
        organizationId: acmeOrg.id,
        userId: 'john123',
      },
    },
    update: {
      name: 'John Doe (Acme)',
      passwordHash: passwordHashJohn,
      role: Role.USER,
    },
    create: {
      organizationId: acmeOrg.id,
      userId: 'john123',
      name: 'John Doe (Acme)',
      passwordHash: passwordHashJohn,
      role: Role.USER,
    },
  });

  const admin1 = await prisma.user.upsert({
    where: {
      organizationId_userId: {
        organizationId: acmeOrg.id,
        userId: 'admin',
      },
    },
    update: {
      name: 'Acme Admin',
      passwordHash: passwordHashAdmin,
      role: Role.ADMIN,
    },
    create: {
      organizationId: acmeOrg.id,
      userId: 'admin',
      name: 'Acme Admin',
      passwordHash: passwordHashAdmin,
      role: Role.ADMIN,
    },
  });

  // Seed Globex Inc (Verified)
  const globexOrg = await prisma.organization.upsert({
    where: { companyCode: 'globex' },
    update: {
      name: 'Globex Inc',
      licenseKey: 'GLOBEX-2026-KEY',
      isVerified: true,
    },
    create: {
      name: 'Globex Inc',
      companyCode: 'globex',
      licenseKey: 'GLOBEX-2026-KEY',
      isVerified: true,
    },
  });

  // Seed Globex SystemConfig
  await prisma.systemConfig.upsert({
    where: { organizationId: globexOrg.id },
    update: { lateEntryTime: '09:30', earlyExitTime: '16:30' },
    create: { organizationId: globexOrg.id, lateEntryTime: '09:30', earlyExitTime: '16:30' },
  });

  // Seed Globex Users
  const user2 = await prisma.user.upsert({
    where: {
      organizationId_userId: {
        organizationId: globexOrg.id,
        userId: 'jane123',
      },
    },
    update: {
      name: 'Jane Smith (Globex)',
      passwordHash: passwordHashJane,
      role: Role.USER,
    },
    create: {
      organizationId: globexOrg.id,
      userId: 'jane123',
      name: 'Jane Smith (Globex)',
      passwordHash: passwordHashJane,
      role: Role.USER,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: {
      organizationId_userId: {
        organizationId: globexOrg.id,
        userId: 'admin',
      },
    },
    update: {
      name: 'Globex Admin',
      passwordHash: passwordHashAdmin,
      role: Role.ADMIN,
    },
    create: {
      organizationId: globexOrg.id,
      userId: 'admin',
      name: 'Globex Admin',
      passwordHash: passwordHashAdmin,
      role: Role.ADMIN,
    },
  });

  console.log('Multi-Tenant Database seeded successfully!');
  console.log(`\n🏢 Organization 1: ${acmeOrg.name} [Verified: ${acmeOrg.isVerified}]`);
  console.log(`   License Key: ${acmeOrg.licenseKey}`);
  console.log(`   - Employee: ${user1.name} (${user1.userId}) | Pass: password123`);
  console.log(`   - Admin:    ${admin1.name} (${admin1.userId}) | Pass: admin123`);
  console.log(`\n🏢 Organization 2: ${globexOrg.name} [Verified: ${globexOrg.isVerified}]`);
  console.log(`   License Key: ${globexOrg.licenseKey}`);
  console.log(`   - Employee: ${user2.name} (${user2.userId}) | Pass: password123`);
  console.log(`   - Admin:    ${admin2.name} (${admin2.userId}) | Pass: admin123`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
