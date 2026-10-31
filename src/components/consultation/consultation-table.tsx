'use client';

import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { ConsultationActionsMenu } from '@/components/consultation/consultation-actions-menu';

interface ConsultationRow {
  id: string;
  status: string;
  urgencyLevel: string;
  createdAt: string | Date;
  symptoms: string[];
  patient: { name: string; phone: string; age?: number | null };
  payment: { amount: number; status: string } | null;
}

interface ConsultationTableProps {
  consultations: ConsultationRow[];
}

export function ConsultationTable({ consultations }: ConsultationTableProps) {
  if (consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 rounded-full bg-gray-100 p-4">
          <AlertTriangle className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900">No consultations found</p>
        <p className="mt-1 text-xs text-gray-500">New consultations will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Patient</th>
            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Symptoms</th>
            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Urgency</th>
            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Payment</th>
            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Date</th>
            <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {consultations.map((c) => (
            <tr key={c.id} className="group hover:bg-gray-50 transition-colors">
              <td className="py-3.5 pr-4">
                <div>
                  <p className="font-medium text-gray-900">{c.patient.name}</p>
                  <p className="text-xs text-gray-500">{c.patient.phone}{c.patient.age ? ` · ${c.patient.age}y` : ''}</p>
                </div>
              </td>
              <td className="py-3.5 pr-4">
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {c.symptoms.slice(0, 2).map((s, i) => (
                    <span key={i} className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {s}
                    </span>
                  ))}
                  {c.symptoms.length > 2 && (
                    <span className="text-xs text-gray-400">+{c.symptoms.length - 2}</span>
                  )}
                </div>
              </td>
              <td className="py-3.5 pr-4">
                <Badge variant={getStatusBadgeVariant(c.urgencyLevel)}>
                  {c.urgencyLevel}
                </Badge>
              </td>
              <td className="py-3.5 pr-4">
                <Badge variant={getStatusBadgeVariant(c.status)}>
                  {c.status.replace('_', ' ')}
                </Badge>
              </td>
              <td className="py-3.5 pr-4">
                {c.payment ? (
                  <div>
                    <p className="font-medium text-gray-900">{formatCurrency(c.payment.amount)}</p>
                    <Badge variant={getStatusBadgeVariant(c.payment.status)} className="mt-0.5">
                      {c.payment.status}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="py-3.5 pr-4">
                <p className="text-xs text-gray-600">{formatDate(c.createdAt)}</p>
              </td>
              <td className="py-3.5 text-right">
                <ConsultationActionsMenu
                  consultationId={c.id}
                  currentStatus={c.status}
                  patientName={c.patient.name}
                  variant="dropdown"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
