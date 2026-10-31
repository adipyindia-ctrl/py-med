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
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      patient: true,
      payment: true,
      prescription: { include: { doctor: true } },
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...consultation,
    symptoms: safeJsonParse<string[]>(consultation.symptoms, []),
    conversationHistory: safeJsonParse(consultation.conversationHistory, []),
    prescription: consultation.prescription
      ? {
          ...consultation.prescription,
          medicines: safeJsonParse(consultation.prescription.medicines, []),
          investigations: safeJsonParse(
            consultation.prescription.investigations ?? '[]',
            [],
          ),
        }
      : null,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.consultation.update({
    where: { id },
    data: {
      status: body.status,
      ...(body.aiSummary && { aiSummary: body.aiSummary }),
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

  const existing = await prisma.consultation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete child records first, then the consultation
  await prisma.$transaction(async (tx) => {
    await tx.prescription.deleteMany({ where: { consultationId: id } });
    await tx.payment.deleteMany({ where: { consultationId: id } });
    await tx.consultation.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
