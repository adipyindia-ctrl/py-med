import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const [
    totalConsultations,
    pendingConsultations,
    completedToday,
    emergencyCases,
    revenueResult,
    consultationsByStatus,
    last7DaysData,
  ] = await Promise.all([
    prisma.consultation.count(),
    prisma.consultation.count({ where: { status: { in: ['PAID', 'IN_REVIEW'] } } }),
    prisma.consultation.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.consultation.count({ where: { status: 'EMERGENCY' } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.consultation.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    // Last 7 days revenue
    prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const totalRevenue = revenueResult._sum.amount ?? 0;

  // Build daily chart data
  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyMap.set(key, 0);
  }
  last7DaysData.forEach((p) => {
    const key = p.createdAt.toISOString().split('T')[0];
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + p.amount);
    }
  });
  const revenueChart = Array.from(dailyMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));

  return NextResponse.json({
    totalConsultations,
    pendingConsultations,
    completedToday,
    emergencyCases,
    totalRevenue,
    consultationsByStatus,
    revenueChart,
  });
}
