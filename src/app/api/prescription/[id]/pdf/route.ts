import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { generatePrescriptionHTML } from '@/lib/pdf/prescription-generator';
import { safeJsonParse } from '@/lib/utils';
import type { Medicine } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      doctor: true,
      consultation: { include: { patient: true } },
    },
  });

  if (!prescription) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const medicines = safeJsonParse<Medicine[]>(prescription.medicines, []);
  const investigations = safeJsonParse<string[]>(prescription.investigations ?? '[]', []);

  const html = await generatePrescriptionHTML({
    prescriptionId: prescription.id,
    doctor: {
      name: prescription.doctor.name,
      qualification: prescription.doctor.qualification,
      registrationNumber: prescription.doctor.registrationNumber,
      specialization: prescription.doctor.specialization ?? undefined,
    },
    patient: {
      name: prescription.consultation.patient.name,
      age: prescription.consultation.patient.age ?? undefined,
      gender: prescription.consultation.patient.gender ?? undefined,
      phone: prescription.consultation.patient.phone,
    },
    diagnosis: prescription.diagnosis,
    medicines,
    investigations,
    followUpInstructions: prescription.followUpInstructions ?? undefined,
    followUpDate: prescription.followUpDate ?? undefined,
    notes: prescription.notes ?? undefined,
    createdAt: prescription.createdAt,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
