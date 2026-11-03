export const instant = false;
import { prisma } from '@/lib/prisma/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { formatDate, maskPhone } from '@/lib/utils';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { PatientActionsMenu } from '@/components/patient/patient-actions-menu';

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function PatientsPage({ searchParams }: PageProps) {
  const { search = '', page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10);
  const limit = 20;
  const skip = (pageNum - 1) * limit;

  const where = search
    ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] }
    : {};

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        _count: { select: { consultations: true } },
        consultations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return (
    <DashboardLayout title="Patients" subtitle={`${total} registered patients`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            All Patients
          </CardTitle>
          <form method="GET" className="flex gap-2">
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by name or phone..."
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button
              type="submit"
              className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </CardHeader>

        <CardContent>
          {patients.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No patients found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Patient</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Age / Gender</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Phone</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Consultations</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Last Visit</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patients.map((p) => {
                    const lastConsult = p.consultations[0];
                    return (
                      <tr key={p.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 shrink-0">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-gray-600">
                          {p.age ? `${p.age} yrs` : '—'} {p.gender ? `· ${p.gender}` : ''}
                        </td>
                        <td className="py-3.5 pr-4 text-gray-600 font-mono text-xs">
                          {maskPhone(p.phone)}
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                            {p._count.consultations}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          {lastConsult ? (
                            <div>
                              <p className="text-xs text-gray-600">{formatDate(lastConsult.createdAt)}</p>
                              <Badge variant={getStatusBadgeVariant(lastConsult.status)} className="mt-0.5">
                                {lastConsult.status}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          <PatientActionsMenu patient={p} variant="dropdown" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                {pageNum > 1 && (
                  <Link href={`/dashboard/patients?${search ? `search=${search}&` : ''}page=${pageNum - 1}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                    Previous
                  </Link>
                )}
                {skip + limit < total && (
                  <Link href={`/dashboard/patients?${search ? `search=${search}&` : ''}page=${pageNum + 1}`}
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
