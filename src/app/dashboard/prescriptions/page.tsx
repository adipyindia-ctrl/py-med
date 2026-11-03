export const instant = false;
import { prisma } from '@/lib/prisma/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, safeJsonParse } from '@/lib/utils';
import { FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Medicine } from '@/types';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function PrescriptionsPage({ searchParams }: PageProps) {
  const { page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10);
  const limit = 20;
  const skip = (pageNum - 1) * limit;

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      include: {
        doctor: true,
        consultation: { include: { patient: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.prescription.count(),
  ]);

  return (
    <DashboardLayout title="Prescriptions" subtitle={`${total} total prescriptions`}>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            All Prescriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No prescriptions issued yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Patient</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Diagnosis</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Medicines</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Doctor</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Date</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Sent</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {prescriptions.map((p) => {
                    const medicines = safeJsonParse<Medicine[]>(p.medicines, []);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 pr-4">
                          <div>
                            <p className="font-medium text-gray-900">{p.consultation.patient.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{p.consultation.patient.phone}</p>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 max-w-[180px]">
                          <p className="truncate text-gray-700">{p.diagnosis}</p>
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="flex flex-col gap-0.5">
                            {medicines.slice(0, 2).map((m, i) => (
                              <span key={i} className="text-xs text-gray-600">{m.name}</span>
                            ))}
                            {medicines.length > 2 && (
                              <span className="text-xs text-gray-400">+{medicines.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <p className="text-xs text-gray-700">Dr. {p.doctor.name}</p>
                          <p className="text-xs text-gray-400">{p.doctor.registrationNumber}</p>
                        </td>
                        <td className="py-3.5 pr-4">
                          <p className="text-xs text-gray-600">{formatDate(p.createdAt)}</p>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.sentToPatient ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {p.sentToPatient ? '✓ Sent' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <a
                            href={`/api/prescription/${p.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink size={12} />
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {total > limit && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                {pageNum > 1 && (
                  <Link href={`/dashboard/prescriptions?page=${pageNum - 1}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                    Previous
                  </Link>
                )}
                {skip + limit < total && (
                  <Link href={`/dashboard/prescriptions?page=${pageNum + 1}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
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
