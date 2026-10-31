export const instant = false;
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { formatCurrency, formatDate, safeJsonParse } from '@/lib/utils';
import {
  Stethoscope,
  Users,
  IndianRupee,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { startOfDay, endOfDay } from 'date-fns';

export default async function DashboardPage() {
  const session = await auth();
  const today = new Date();

  const [
    totalConsultations,
    pendingConsultations,
    completedToday,
    emergencyCases,
    revenueResult,
    recentConsultations,
  ] = await Promise.all([
    prisma.consultation.count(),
    prisma.consultation.count({ where: { status: { in: ['PAID', 'IN_REVIEW'] } } }),
    prisma.consultation.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    }),
    prisma.consultation.count({ where: { status: 'EMERGENCY' } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.consultation.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { patient: true, payment: true },
    }),
  ]);

  const totalRevenue = revenueResult._sum.amount ?? 0;
  const doctorName = session?.user?.name?.split(' ')[0] ?? 'Doctor';

  return (
    <DashboardLayout
      title={`Good morning, Dr. ${doctorName} 👋`}
      subtitle={`${today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Consultations"
          value={totalConsultations}
          icon={<Stethoscope size={20} />}
          color="blue"
          change="All time"
        />
        <StatCard
          title="Pending Review"
          value={pendingConsultations}
          icon={<Clock size={20} />}
          color="yellow"
          change="Awaiting your action"
          changeType={pendingConsultations > 0 ? 'negative' : 'positive'}
        />
        <StatCard
          title="Completed Today"
          value={completedToday}
          icon={<CheckCircle2 size={20} />}
          color="green"
          change="Today"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<IndianRupee size={20} />}
          color="purple"
          change="All time earnings"
        />
      </div>

      {/* Emergency banner */}
      {emergencyCases > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">
            {emergencyCases} emergency case{emergencyCases > 1 ? 's' : ''} detected. Please review immediately.
          </p>
          <Link
            href="/dashboard/consultations?status=EMERGENCY"
            className="ml-auto shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            View Now
          </Link>
        </div>
      )}

      {/* Recent Consultations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Recent Consultations</CardTitle>
          <Link
            href="/dashboard/consultations"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {recentConsultations.length === 0 ? (
            <div className="py-12 text-center">
              <Stethoscope className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No consultations yet</p>
              <p className="text-xs text-gray-400 mt-1">Consultations will appear here once patients start messaging</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentConsultations.map((c) => {
                const symptoms = safeJsonParse<string[]>(c.symptoms, []);
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/consultations/${c.id}`}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-6 px-6 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {c.patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.patient.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {symptoms.slice(0, 2).join(', ') || 'No symptoms recorded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div className="hidden sm:block">
                        <Badge variant={getStatusBadgeVariant(c.status)}>
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
