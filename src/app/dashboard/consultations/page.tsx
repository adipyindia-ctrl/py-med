export const instant = false;
import { prisma } from '@/lib/prisma/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ConsultationTable } from '@/components/consultation/consultation-table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { safeJsonParse } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PAID' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Emergency', value: 'EMERGENCY' },
];

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function ConsultationsPage({ searchParams }: PageProps) {
  const { status = '', page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10);
  const limit = 20;
  const skip = (pageNum - 1) * limit;

  const where = status ? { status } : {};

  const [consultations, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      include: { patient: true, payment: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.consultation.count({ where }),
  ]);

  const formatted = consultations.map((c) => ({
    ...c,
    symptoms: safeJsonParse<string[]>(c.symptoms, []),
  }));

  return (
    <DashboardLayout
      title="Consultations"
      subtitle={`${total} total consultations`}
    >
      <Card>
        {/* Tabs */}
        <CardHeader className="pb-0">
          <div className="flex gap-1 border-b border-gray-100 -mb-px overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const isActive = tab.value === status;
              return (
                <Link
                  key={tab.value}
                  href={`/dashboard/consultations${tab.value ? `?status=${tab.value}` : ''}`}
                  className={cn(
                    'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <ConsultationTable consultations={formatted} />

          {/* Pagination */}
          {total > limit && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                {pageNum > 1 && (
                  <Link
                    href={`/dashboard/consultations?${status ? `status=${status}&` : ''}page=${pageNum - 1}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {skip + limit < total && (
                  <Link
                    href={`/dashboard/consultations?${status ? `status=${status}&` : ''}page=${pageNum + 1}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
