export const instant = false;
import { prisma } from '@/lib/prisma/client';
import { auth } from '@/lib/auth/config';
import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { PrescriptionForm } from '@/components/prescription/prescription-form';
import { formatDate, formatCurrency, safeJsonParse } from '@/lib/utils';
import type { ConversationMessage, Medicine } from '@/types';
import {
  User,
  Phone,
  Clock,
  MessageSquare,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { ConsultationActionsMenu } from '@/components/consultation/consultation-actions-menu';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultationDetailPage({ params }: PageProps) {
  const session = await auth();

  const { id } = await params;

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      patient: true,
      payment: true,
      prescription: { include: { doctor: true } },
    },
  });

  if (!consultation) notFound();

  const symptoms = safeJsonParse<string[]>(consultation.symptoms, []);
  const history = safeJsonParse<ConversationMessage[]>(consultation.conversationHistory, []);
  const medicines = consultation.prescription
    ? safeJsonParse<Medicine[]>(consultation.prescription.medicines, [])
    : [];
  const investigations = consultation.prescription
    ? safeJsonParse<string[]>(consultation.prescription.investigations ?? '[]', [])
    : [];

  const canWritePrescription =
    ['PAID', 'IN_REVIEW'].includes(consultation.status) && !consultation.prescription;

  return (
    <DashboardLayout
      title="Consultation Detail"
      subtitle={`#${consultation.id.slice(0, 8).toUpperCase()}`}
    >
      <div className="flex items-center justify-between gap-2 mb-5">
        <Link href="/dashboard/consultations" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to consultations
        </Link>
        <ConsultationActionsMenu
          consultationId={consultation.id}
          currentStatus={consultation.status}
          patientName={consultation.patient.name}
          variant="inline"
          afterDeleteHref="/dashboard/consultations"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-1">
          {/* Patient Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User size={16} className="text-blue-600" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {consultation.patient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{consultation.patient.name}</p>
                  <p className="text-xs text-gray-500">{consultation.patient.gender ?? 'N/A'} · {consultation.patient.age ? `${consultation.patient.age} yrs` : 'N/A'}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-gray-400" />
                  <span className="text-gray-700">{consultation.patient.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400">Allergies: </span>
                  <span className="text-gray-700">{consultation.patient.allergies ?? 'None'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Current Medicines: </span>
                  <span className="text-gray-700">{consultation.patient.currentMedicines ?? 'None'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Consultation Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant={getStatusBadgeVariant(consultation.status)}>
                  {consultation.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Urgency</span>
                <Badge variant={getStatusBadgeVariant(consultation.urgencyLevel)}>
                  {consultation.urgencyLevel}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-xs text-gray-700">{formatDate(consultation.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          {consultation.payment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard size={16} className="text-blue-600" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold">{formatCurrency(consultation.payment.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant={getStatusBadgeVariant(consultation.payment.status)}>
                    {consultation.payment.status}
                  </Badge>
                </div>
                {consultation.payment.paymentMethod && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Method</span>
                    <span className="text-gray-700 uppercase text-xs">{consultation.payment.paymentMethod}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Emergency Alert */}
          {consultation.status === 'EMERGENCY' && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Emergency Case</p>
                <p className="text-sm text-red-700 mt-1">
                  Patient was directed to emergency services. Please follow up immediately.
                </p>
              </div>
            </div>
          )}

          {/* Symptoms & AI Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Symptoms & Clinical Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {symptoms.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reported Symptoms</p>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map((s, i) => (
                      <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {consultation.symptomsDuration && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={14} className="text-gray-400" />
                  Duration: <span className="font-medium">{consultation.symptomsDuration}</span>
                </div>
              )}
              {consultation.voiceTranscript && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Voice Transcript</p>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 italic">
                    "{consultation.voiceTranscript}"
                  </div>
                </div>
              )}
              {consultation.aiSummary && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">AI Clinical Summary</p>
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 border border-blue-100">
                    {consultation.aiSummary}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Prescription */}
          {consultation.prescription && (
            <Card className="border-emerald-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
                  <CheckCircle2 size={16} />
                  Prescription Issued
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Diagnosis</p>
                  <p className="font-semibold text-gray-900">{consultation.prescription.diagnosis}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Medicines</p>
                  <div className="space-y-2">
                    {medicines.map((m, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{m.name} — {m.dosage}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{m.frequency} · {m.duration}{m.instructions ? ` · ${m.instructions}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {investigations.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Investigations</p>
                    <ul className="space-y-1">
                      {investigations.map((inv, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                          {inv}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <a
                  href={`/api/prescription/${consultation.prescription.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <FileText size={14} />
                  View Prescription PDF
                </a>
              </CardContent>
            </Card>
          )}

          {/* Prescription Form */}
          {canWritePrescription && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText size={16} className="text-blue-600" />
                  Write Prescription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PrescriptionForm
                  consultationId={consultation.id}
                  patientName={consultation.patient.name}
                  aiSummary={consultation.aiSummary}
                  symptoms={symptoms}
                />
              </CardContent>
            </Card>
          )}

          {/* Conversation History */}
          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare size={16} className="text-blue-600" />
                  WhatsApp Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {history.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'bot' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === 'bot'
                            ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                            : 'bg-blue-600 text-white rounded-tr-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className={`mt-1 text-right text-xs ${msg.role === 'bot' ? 'text-gray-400' : 'text-blue-200'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
