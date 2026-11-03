import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma/client';
import { generatePrescriptionHTML } from '@/lib/pdf/prescription-generator';
import { safeJsonParse } from '@/lib/utils';
import { z } from 'zod';
import type { Medicine } from '@/types';

const medicineSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  instructions: z.string().optional(),
});

const prescriptionSchema = z.object({
  consultationId: z.string(),
  diagnosis: z.string().min(1),
  medicines: z.array(medicineSchema).min(1),
  investigations: z.array(z.string()).optional(),
  followUpInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = prescriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const {
      consultationId,
      diagnosis,
      medicines,
      investigations,
      followUpInstructions,
      followUpDate,
      notes,
    } = parsed.data;

    const doctor = await prisma.doctor.findUnique({
      where: { email: session.user?.email ?? '' },
    });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { patient: true },
    });
    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Check if prescription already exists
    const existing = await prisma.prescription.findUnique({
      where: { consultationId },
    });
    if (existing) {
      return NextResponse.json({ error: 'Prescription already exists for this consultation' }, { status: 409 });
    }

    // Create prescription record
    const prescription = await prisma.prescription.create({
      data: {
        consultationId,
        doctorId: doctor.id,
        diagnosis,
        medicines: JSON.stringify(medicines),
        investigations: investigations?.length ? JSON.stringify(investigations) : null,
        followUpInstructions: followUpInstructions ?? null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes ?? null,
      },
    });

    // Build prescription URL
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const prescriptionUrl = `${appUrl}/api/prescription/${prescription.id}/pdf`;

    // Update prescription with URL
    await prisma.prescription.update({
      where: { id: prescription.id },
      data: { pdfUrl: prescriptionUrl, sentToPatient: true },
    });

    // Update consultation → COMPLETED
    await prisma.consultation.update({
      where: { id: consultationId },
      data: { status: 'COMPLETED' },
    });

    // Send WhatsApp notification — non-blocking, never throws
    try {
      const { sendPrescriptionReady } = await import('@/lib/whatsapp/conversation-engine');
      await sendPrescriptionReady(consultation.patient.phone, prescriptionUrl, 'hinglish', false);
    } catch (whatsappErr) {
      console.warn('[Prescription] WhatsApp send failed:', whatsappErr);
    }

    return NextResponse.json(
      {
        success: true,
        prescription: {
          id: prescription.id,
          diagnosis: prescription.diagnosis,
          medicines: safeJsonParse<Medicine[]>(prescription.medicines, []),
          pdfUrl: prescriptionUrl,
          sentToPatient: true,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Prescription API] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
