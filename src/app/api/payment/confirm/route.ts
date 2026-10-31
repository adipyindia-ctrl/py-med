/**
 * POST /api/payment/confirm
 *
 * Called by the /payment/success page immediately after the user lands there.
 * This is the primary trigger for the WhatsApp confirmation in local dev where
 * Cashfree cannot reach localhost for webhooks.
 *
 * Flow:
 *  1. Receive { link_id } from the success page.
 *  2. Look up the pending Payment record by cashfreeOrderId = link_id.
 *  3. Verify the link status directly with Cashfree (fetchLinkStatus).
 *  4. On PAID: mark consultation PAID, generate AI summary, send WhatsApp.
 *  5. Return { status: 'ok' | 'pending' | 'already_processed' }.
 *
 * Idempotent — if the payment is already SUCCESS (webhook fired first), we
 * skip the WhatsApp send and return 'already_processed' to avoid duplicates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { fetchLinkStatus } from '@/lib/payment/cashfree';
import { sendPaymentConfirmation } from '@/lib/whatsapp/conversation-engine';
import { generateAISummaryForDoctor } from '@/lib/ai/transcription';
import { safeJsonParse } from '@/lib/utils';
import type { DetectedLanguage } from '@/lib/ai/language';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let linkId: string;

  try {
    const body = await request.json();
    linkId = body?.link_id ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!linkId) {
    return NextResponse.json({ error: 'link_id is required' }, { status: 400 });
  }

  // Find the payment record
  const payment = await prisma.payment.findFirst({
    where: { cashfreeOrderId: linkId },
    include: {
      consultation: { include: { patient: true } },
    },
  });

  if (!payment) {
    console.error('[Confirm] No payment record for link_id:', linkId);
    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
  }

  // Already processed by webhook — skip to avoid duplicate WhatsApp message
  if (payment.status === 'SUCCESS') {
    return NextResponse.json({ status: 'already_processed' });
  }

  // Verify with Cashfree directly
  let linkStatus: string;
  try {
    const res = await fetchLinkStatus(linkId);
    linkStatus = res.link_status; // PAID | PARTIALLY_PAID | ACTIVE | EXPIRED | CANCELLED
  } catch (err) {
    console.error('[Confirm] Cashfree fetchLinkStatus failed:', err);
    return NextResponse.json({ error: 'Could not verify payment status' }, { status: 502 });
  }

  if (linkStatus !== 'PAID') {
    // Payment not complete yet (still ACTIVE or PARTIALLY_PAID)
    return NextResponse.json({ status: 'pending', link_status: linkStatus });
  }

  const consultation = payment.consultation;
  const patient = consultation.patient;
  const lang = (consultation.detectedLanguage as DetectedLanguage) ?? 'hinglish';

  // Update payment to SUCCESS
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'SUCCESS' },
  });

  // Mark consultation PAID
  await prisma.consultation.update({
    where: { id: consultation.id },
    data: { status: 'PAID', conversationState: 'PAYMENT_DONE' },
  });

  // Generate AI summary for doctor (non-blocking)
  try {
    const symptoms = safeJsonParse<string[]>(consultation.symptoms, []);
    const summary = await generateAISummaryForDoctor({
      symptoms,
      symptomsDuration: consultation.symptomsDuration ?? undefined,
      age: patient.age ?? undefined,
      gender: patient.gender ?? undefined,
      allergies: patient.allergies ?? undefined,
      currentMedicines: patient.currentMedicines ?? undefined,
      voiceTranscript: consultation.voiceTranscript ?? undefined,
    });
    await prisma.consultation.update({
      where: { id: consultation.id },
      data: { aiSummary: summary },
    });
  } catch (err) {
    console.error('[Confirm] AI summary failed:', err);
  }

  // Send WhatsApp confirmation in patient's language
  await sendPaymentConfirmation(patient.phone, lang, false);

  return NextResponse.json({ status: 'ok' });
}
