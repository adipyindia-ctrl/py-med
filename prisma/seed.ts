import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL ?? 'file:./dev.db';
  const filePart = raw.replace(/^file:/, '');
  if (path.isAbsolute(filePart)) return filePart;
  return path.resolve(process.cwd(), filePart);
}

const adapter = new PrismaBetterSqlite3({ url: resolveDbPath() });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_DOCTOR_EMAIL ?? 'doctor@medivoice.ai';
  const password = process.env.SEED_DOCTOR_PASSWORD ?? 'doctor123';

  const existing = await prisma.doctor.findUnique({ where: { email } });
  if (existing) {
    console.log(`Doctor already exists: ${email}`);
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
  console.log(`   Reg: ${doctor.registrationNumber}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
