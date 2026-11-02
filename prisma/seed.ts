import { config } from 'dotenv';
// Load env files before anything else reads process.env
config({ path: '.env' });
config({ path: '.env.local', override: true });

import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set.\n' +
      'Add it to .env or .env.local before running the seed.'
    );
  }

  const pool = new pg.Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    ssl: { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const email = process.env.SEED_DOCTOR_EMAIL ?? 'doctor@medivoice.ai';
    const password = process.env.SEED_DOCTOR_PASSWORD ?? 'doctor123';

    const existing = await prisma.doctor.findUnique({ where: { email } });
    if (existing) {
      console.log(`✓ Doctor already exists: ${email}`);
      return;
    }

    const hashed = await bcrypt.hash(password, 12);

    const doctor = await prisma.doctor.create({
      data: {
        name: 'Dr. Rajesh Sharma',
        email,
        password: hashed,
        qualification: 'MBBS, MD (General Medicine)',
        registrationNumber: 'MCI-12345-2015',
        specialization: 'General Physician',
        phone: '+919876543210',
        isActive: true,
      },
    });

    await prisma.knowledgeBase.createMany({
      data: [
        {
          category: 'Fever',
          symptom: 'fever',
          description: 'Elevated body temperature above 98.6°F (37°C)',
          guideline: 'Paracetamol 500mg TDS, Hydration, Rest. Investigate if persists > 3 days.',
        },
        {
          category: 'Cold',
          symptom: 'common cold',
          description: 'Upper respiratory tract infection',
          guideline: 'Antihistamine, nasal decongestant, warm fluids, rest.',
        },
        {
          category: 'Gastritis',
          symptom: 'stomach pain vomiting',
          description: 'Gastric inflammation or infection',
          guideline: 'Antacid, domperidone, ORS. Avoid spicy food. Seek care if blood in vomit.',
        },
      ],
    });

    console.log(`✅ Seeded doctor: ${email} / ${password}`);
    console.log(`   Name: ${doctor.name}`);
    console.log(`   Reg#: ${doctor.registrationNumber}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Seed failed:', e?.message ?? e);
  process.exit(1);
});
