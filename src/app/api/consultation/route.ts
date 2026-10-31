import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma/client';
import { safeJsonParse } from '@/lib/utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [consultations, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      include: {
        patient: true,
        payment: true,
        prescription: { include: { doctor: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.consultation.count({ where }),
  ]);

  const formatted = consultations.map((c) => ({
    ...c,
    symptoms: safeJsonParse<string[]>(c.symptoms, []),
    conversationHistory: safeJsonParse(c.conversationHistory, []),
    prescription: c.prescription
      ? {
          ...c.prescription,
          medicines: safeJsonParse(c.prescription.medicines, []),
          investigations: safeJsonParse(c.prescription.investigations ?? '[]', []),
        }
      : null,
  }));

  return NextResponse.json({ data: formatted, total, page, limit });
}
