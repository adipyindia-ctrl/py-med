import axios from 'axios';
import crypto from 'crypto';
import { CASHFREE_API_VERSION, CURRENCY } from '@/lib/constants';
import { generateOrderId } from '@/lib/utils';

const APP_ID = process.env.CASHFREE_APP_ID!;
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;
const API_URL = process.env.CASHFREE_API_URL ?? 'https://sandbox.cashfree.com/pg';

const cashfreeAxios = axios.create({
  baseURL: API_URL,
  headers: {
    'x-client-id': APP_ID,
    'x-client-secret': SECRET_KEY,
    'x-api-version': CASHFREE_API_VERSION,
    'Content-Type': 'application/json',
  },
});

export interface CreatePaymentLinkInput {
  amount: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  consultationId: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface CashfreePaymentLinkResponse {
  cf_link_id: string;
  link_id: string;
  link_status: string;
  link_url: string;
  link_expiry_time: string;
}

/**
 * Creates a Cashfree Payment Link (POST /links).
 *
 * Payment Links return a direct `link_url` that can be shared over WhatsApp
 * or SMS without any JS SDK. This is the correct approach for server-generated
 * shareable payment URLs.
 *
 * Do NOT use the Orders API (POST /orders) for this — that returns a
 * `payment_session_id` which requires the Cashfree JS SDK to open checkout,
 * causing "Invalid form pl" errors when used as a raw URL.
 */
export async function createCashfreePaymentLink(
  input: CreatePaymentLinkInput,
): Promise<CashfreePaymentLinkResponse> {
  const linkId = generateOrderId('ML');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const payload = {
    link_id: linkId,
    link_amount: input.amount,
    link_currency: CURRENCY,
    link_purpose: `MediVoice Consultation - ${input.consultationId}`,
    customer_details: {
      customer_name: input.customerName || 'Patient',
      // Cashfree requires exactly 10-digit Indian number — strip country code
      customer_phone: input.customerPhone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10),
      customer_email: input.customerEmail ?? `patient+${input.customerId.slice(-8)}@medivoice.ai`,
    },
    link_meta: {
      return_url: input.returnUrl ?? `${appUrl}/payment/success?link_id=${linkId}`,
      notify_url: input.notifyUrl ?? `${appUrl}/api/payment/webhook`,
    },
    link_notify: {
      send_sms: false,
      send_email: false,
      send_whatsapp: false, // We send the link ourselves via WhatsApp
    },
    link_auto_reminders: false,
    link_notes: {
      consultation_id: input.consultationId,
    },
  };

  const response = await cashfreeAxios.post<CashfreePaymentLinkResponse>('/links', payload);
  return response.data;
}

export async function fetchLinkStatus(linkId: string): Promise<{
  link_status: string;
  link_amount: number;
  link_amount_paid: number;
  cf_link_id: string;
}> {
  const response = await cashfreeAxios.get(`/links/${linkId}`);
  return response.data;
}

export async function fetchOrderStatus(orderId: string): Promise<{
  order_status: string;
  order_amount: number;
  cf_order_id: string;
}> {
  const response = await cashfreeAxios.get(`/orders/${orderId}`);
  return response.data;
}

export function verifyCashfreeWebhook(
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  const message = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('base64');
  return expectedSignature === signature;
}
