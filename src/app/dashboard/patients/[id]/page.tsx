export const instant = false;
import { prisma } from '@/lib/prisma/client';
import { auth } from '@/lib/auth/config';
import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { formatDate, formatCurrency, safeJsonParse } from '@/lib/utils';
import Link from 'next/link';
import { User, Phone, Pill, AlertCircle, Stethoscope } from 'lucide-react';
import { PatientActionsMenu } from '@/components/patient/patient-actions-menu';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PageProps) {
  const session = await auth();

  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      consultations: {
        include: { payment: true, prescription: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!patient) notFound();

  return (
    <DashboardLayout title="Patient Profile" subtitle={patient.name}>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard/patients" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to patients
        </Link>
        <PatientActionsMenu
          patient={patient}
          variant="inline"
          afterDeleteHref="/dashboard/patients"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Patient Card */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{patient.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {patient.age ? `${patient.age} yrs` : 'Age N/A'} · {patient.gender ?? 'N/A'}
              </p>
              <p className="mt-2 text-sm font-mono text-gray-600">{patient.phone}</p>
              <p className="mt-2 text-xs text-gray-400">
                Patient since {formatDate(patient.createdAt)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle size={14} className="text-orange-500" />
                Medical Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Allergies</p>
                <p className="text-gray-700 font-medium">{patient.allergies ?? 'None reported'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Medicines</p>
                <p className="text-gray-700 font-medium">{patient.currentMedicines ?? 'None reported'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{patient.consultations.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Consultations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consultation History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope size={16} className="text-blue-600" />
                Consultation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.consultations.length === 0 ? (
                <div className="py-12 text-center">
                  <Stethoscope className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No consultations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patient.consultations.map((c) => {
                    const symptoms = safeJsonParse<string[]>(c.symptoms, []);
                    return (
                      <Link
                        key={c.id}
                        href={`/dashboard/consultations/${c.id}`}
                        className="block rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getStatusBadgeVariant(c.status)}>
                                {c.status.replace('_', ' ')}
                              </Badge>
                              <Badge variant={getStatusBadgeVariant(c.urgencyLevel)}>
                                {c.urgencyLevel}
                              </Badge>
                            </div>
                            {symptoms.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {symptoms.slice(0, 3).map((s, i) => (
                                  <span key={i} className="text-xs text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                          </div>
                          <div className="text-right ml-4">
                            {c.payment && (
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(c.payment.amount)}
                              </p>
                            )}
                            {c.prescription && (
                              <p className="text-xs text-emerald-600 font-medium mt-1">
                                ✓ Prescribed
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
