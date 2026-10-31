import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma/client';
import { safeJsonParse } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      consultations: {
        include: {
          payment: true,
          prescription: { include: { doctor: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formatted = {
    ...patient,
    consultations: patient.consultations.map((c) => ({
      ...c,
      symptoms: safeJsonParse<string[]>(c.symptoms, []),
      conversationHistory: [],
      prescription: c.prescription
        ? {
            ...c.prescription,
            medicines: safeJsonParse(c.prescription.medicines, []),
          }
        : null,
    })),
  };

  return NextResponse.json(formatted);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.patient.update({
    where: { id },
    data: {
      ...(body.name     !== undefined && { name: body.name }),
      ...(body.age      !== undefined && { age: body.age === '' ? null : Number(body.age) }),
      ...(body.gender   !== undefined && { gender: body.gender || null }),
      ...(body.phone    !== undefined && { phone: body.phone }),
      ...(body.allergies        !== undefined && { allergies: body.allergies || null }),
      ...(body.currentMedicines !== undefined && { currentMedicines: body.currentMedicines || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cascade: delete prescriptions, payments, consultations, then patient
  await prisma.$transaction(async (tx) => {
    const consultations = await tx.consultation.findMany({
      where: { patientId: id },
      select: { id: true },
    });
    const consultationIds = consultations.map((c) => c.id);

    if (consultationIds.length > 0) {
      await tx.prescription.deleteMany({ where: { consultationId: { in: consultationIds } } });
      await tx.payment.deleteMany({ where: { consultationId: { in: consultationIds } } });
      await tx.consultation.deleteMany({ where: { patientId: id } });
    }

    await tx.patient.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
