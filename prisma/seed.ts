import { PrismaClient, Role, AttendanceType } from '@prisma/client';
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
  // workingDays is reset explicitly (Mon-Fri) so the seeded absence data
  // below is deterministic even if it was changed via the admin Calendar UI.
  await prisma.systemConfig.upsert({
    where: { organizationId: acmeOrg.id },
    update: { lateEntryTime: '09:00', earlyExitTime: '17:00', workingDays: '1,2,3,4,5' },
    create: { organizationId: acmeOrg.id, lateEntryTime: '09:00', earlyExitTime: '17:00', workingDays: '1,2,3,4,5' },
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

  // Seed example Attendance History for the Acme Admin account, so the
  // Dashboard's attendance graph/logs toggle has varied data to render
  // (different dates, different entry/exit times, mixed punctuality, and
  // a couple of deliberate no-shows to demo the Absent tracking feature).
  // Only the last 13 days are used (today is left clear) so the seeded
  // account can still exercise the live Entry/Exit buttons afterward, and
  // everything stays inside the 14-day window the absence feature scans.
  //
  // Days 12 and 8 ago (both Mon-Fri working days) are intentionally left
  // with NO records at all -> AttendanceService.getAbsenceRecordsForRange
  // will report those as ABSENT for this account.
  const daysAgo = (n: number, hour: number, minute: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  await prisma.attendance.deleteMany({
    where: { organizationId: acmeOrg.id, userId: admin1.userId },
  });

  const adminAttendanceHistory: { type: AttendanceType; statusFlag: string; timestamp: Date }[] = [
    { type: AttendanceType.ENTRY, statusFlag: 'ON_TIME', timestamp: daysAgo(13, 8, 50) },
    { type: AttendanceType.EXIT, statusFlag: 'ON_TIME', timestamp: daysAgo(13, 17, 15) },
    // daysAgo(12) intentionally has no records -> shows as ABSENT
    { type: AttendanceType.ENTRY, statusFlag: 'LATE', timestamp: daysAgo(9, 9, 15) },
    { type: AttendanceType.EXIT, statusFlag: 'ON_TIME', timestamp: daysAgo(9, 17, 20) },
    // daysAgo(8) intentionally has no records -> shows as ABSENT
    { type: AttendanceType.ENTRY, statusFlag: 'ON_TIME', timestamp: daysAgo(7, 8, 40) },
    { type: AttendanceType.EXIT, statusFlag: 'EARLY_EXIT', timestamp: daysAgo(7, 16, 50) },
    { type: AttendanceType.ENTRY, statusFlag: 'ON_TIME', timestamp: daysAgo(6, 8, 45) },
    { type: AttendanceType.EXIT, statusFlag: 'ON_TIME', timestamp: daysAgo(6, 17, 10) },
    { type: AttendanceType.ENTRY, statusFlag: 'LATE', timestamp: daysAgo(5, 9, 20) },
    { type: AttendanceType.EXIT, statusFlag: 'EARLY_EXIT', timestamp: daysAgo(5, 16, 45) },
    { type: AttendanceType.ENTRY, statusFlag: 'ON_TIME', timestamp: daysAgo(4, 8, 55) },
    { type: AttendanceType.EXIT, statusFlag: 'ON_TIME', timestamp: daysAgo(4, 17, 30) },
    { type: AttendanceType.ENTRY, statusFlag: 'LATE', timestamp: daysAgo(3, 9, 5) },
    { type: AttendanceType.EXIT, statusFlag: 'ON_TIME', timestamp: daysAgo(3, 17, 0) },
    { type: AttendanceType.ENTRY, statusFlag: 'ON_TIME', timestamp: daysAgo(2, 8, 30) },
    { type: AttendanceType.EXIT, statusFlag: 'EARLY_EXIT', timestamp: daysAgo(2, 16, 15) },
    { type: AttendanceType.ENTRY, statusFlag: 'LATE', timestamp: daysAgo(1, 9, 45) },
    { type: AttendanceType.EXIT, statusFlag: 'ON_TIME', timestamp: daysAgo(1, 17, 45) },
  ];

  await prisma.attendance.createMany({
    data: adminAttendanceHistory.map((rec) => ({
      organizationId: acmeOrg.id,
      userId: admin1.userId,
      type: rec.type,
      statusFlag: rec.statusFlag,
      timestamp: rec.timestamp,
    })),
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
  console.log(`     -> Seeded with ${adminAttendanceHistory.length} example Attendance records over the last 13 days (mixed punctuality) for graph/logs demo purposes.`);
  console.log(`     -> Days 8 and 12 ago were left with no records -> should show as ABSENT (working days = Mon-Fri).`);
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
