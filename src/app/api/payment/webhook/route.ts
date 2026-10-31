import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyCashfreeWebhook } from '@/lib/payment/cashfree';
import { sendPaymentConfirmation } from '@/lib/whatsapp/conversation-engine';
import { generateAISummaryForDoctor } from '@/lib/ai/transcription';
import { safeJsonParse } from '@/lib/utils';
import type { DetectedLanguage } from '@/lib/ai/language';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-webhook-timestamp') ?? '';
  const signature = request.headers.get('x-webhook-signature') ?? '';

  // Verify webhook signature
  const isValid = verifyCashfreeWebhook(timestamp, rawBody, signature);
  if (!isValid) {
    console.error('[PaymentWebhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { type, data } = payload;

  if (
    type !== 'PAYMENT_SUCCESS_WEBHOOK' &&
    type !== 'PAYMENT_FAILED_WEBHOOK' &&
    type !== 'PAYMENT_LINK_EVENT'
  ) {
    return NextResponse.json({ status: 'ignored' });
  }

  // Payment Links fire PAYMENT_LINK_EVENT; link status PAID means success.
  // Standard order webhooks use PAYMENT_SUCCESS_WEBHOOK / PAYMENT_FAILED_WEBHOOK.
  let paymentStatus: 'SUCCESS' | 'FAILED';
  if (type === 'PAYMENT_LINK_EVENT') {
    paymentStatus = data?.link_status === 'PAID' ? 'SUCCESS' : 'FAILED';
  } else {
    paymentStatus = type === 'PAYMENT_SUCCESS_WEBHOOK' ? 'SUCCESS' : 'FAILED';
  }

  // For Payment Link events the order_id sits inside data.order.order_id.
  // We stored link_id (not order_id) as cashfreeOrderId, so look it up by link_id first.
  const linkId: string = data?.link_id ?? '';
  const orderId: string = data?.order?.order_id ?? '';
  const paymentMethod: string = data?.payment?.payment_group ?? '';

  const cfPaymentId: string = data?.payment?.cf_payment_id?.toString() ?? '';

  // Look up the payment record — stored as link_id (Payment Links) or order_id (legacy)
  const payment = await prisma.payment.findFirst({
    where: {
      cashfreeOrderId: linkId || orderId,
    },
    include: {
      consultation: { include: { patient: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
  }

  // Skip if already processed by /api/payment/confirm (success-page trigger) to avoid
  // sending a duplicate WhatsApp confirmation when both paths fire.
  if (payment.status === 'SUCCESS') {
    return NextResponse.json({ status: 'already_processed' });
  }

  // Update payment record
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: paymentStatus,
      cashfreePaymentId: cfPaymentId,
      paymentMethod,
      webhookData: rawBody,
    },
  });

  if (paymentStatus === 'SUCCESS') {
    const consultation = payment.consultation;
    const patient = consultation.patient;
    const lang = (consultation.detectedLanguage as DetectedLanguage) ?? 'hinglish';

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
      console.error('[PaymentWebhook] AI summary failed:', err);
    }

    // Notify patient in their own language
    await sendPaymentConfirmation(patient.phone, lang, false);
  }

  return NextResponse.json({ status: 'ok' });
}
