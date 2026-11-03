export const instant = false;
import { prisma } from '@/lib/prisma/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import { AnalyticsCharts } from './analytics-charts';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import {
  TrendingUp,
  Users,
  IndianRupee,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export default async function AnalyticsPage() {
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);

  const [
    totalConsultations,
    completedConsultations,
    emergencyCases,
    totalPatients,
    revenueResult,
    last7DaysPayments,
    statusDistribution,
  ] = await Promise.all([
    prisma.consultation.count(),
    prisma.consultation.count({ where: { status: 'COMPLETED' } }),
    prisma.consultation.count({ where: { status: 'EMERGENCY' } }),
    prisma.patient.count(),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: sevenDaysAgo },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.consultation.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
  ]);

  const totalRevenue = revenueResult._sum.amount ?? 0;
  const completionRate =
    totalConsultations > 0
      ? Math.round((completedConsultations / totalConsultations) * 100)
      : 0;

  // Build 7-day revenue chart data
  const dailyRevenue: { date: string; revenue: number; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(today, i);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    const revenue = last7DaysPayments
      .filter((p) => p.createdAt.toISOString().split('T')[0] === key)
      .reduce((sum, p) => sum + p.amount, 0);
    dailyRevenue.push({ date: key, revenue, label });
  }

  // Status distribution for pie chart
  const statusData = statusDistribution.map((s) => ({
    name: s.status.replace('_', ' '),
    value: s._count.status,
  }));

  return (
    <DashboardLayout title="Analytics" subtitle="Platform performance overview">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<IndianRupee size={20} />}
          color="purple"
        />
        <StatCard
          title="Total Patients"
          value={totalPatients}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={<CheckCircle2 size={20} />}
          color="green"
        />
        <StatCard
          title="Emergency Cases"
          value={emergencyCases}
          icon={<AlertTriangle size={20} />}
          color="red"
        />
      </div>

      {/* Charts — Client Component */}
      <AnalyticsCharts dailyRevenue={dailyRevenue} statusData={statusData} />
    </DashboardLayout>
  );
}
