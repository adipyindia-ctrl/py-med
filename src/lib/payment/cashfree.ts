import axios from 'axios';
import crypto from 'crypto';
import { CASHFREE_API_VERSION, CURRENCY } from '@/lib/constants';
import { generateOrderId } from '@/lib/utils';

const APP_ID = process.env.CASHFREE_APP_ID!;
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;

/**
 * Derive Cashfree base URL from environment.
 * Priority: CASHFREE_API_URL (explicit) > CASHFREE_ENV ('production' → prod URL) > sandbox default.
 */
function getCashfreeApiUrl(): string {
  if (process.env.CASHFREE_API_URL) return process.env.CASHFREE_API_URL;
  if (process.env.CASHFREE_ENV === 'production') return 'https://api.cashfree.com/pg';
  return 'https://sandbox.cashfree.com/pg';
}

/**
 * Create a fresh Cashfree axios instance per call so that runtime changes
 * to CASHFREE_ENV / CASHFREE_API_URL (via Settings UI) take effect without
 * requiring a server restart.
 */
function getCashfreeClient() {
  return axios.create({
    baseURL: getCashfreeApiUrl(),
    headers: {
      'x-client-id': process.env.CASHFREE_APP_ID ?? APP_ID,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY ?? SECRET_KEY,
      'x-api-version': CASHFREE_API_VERSION,
      'Content-Type': 'application/json',
    },
  });
}

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
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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

  const response = await getCashfreeClient().post<CashfreePaymentLinkResponse>('/links', payload);
  return response.data;
}

export async function fetchLinkStatus(linkId: string): Promise<{
  link_status: string;
  link_amount: number;
  link_amount_paid: number;
  cf_link_id: string;
}> {
  const response = await getCashfreeClient().get(`/links/${linkId}`);
  return response.data;
}

export async function fetchOrderStatus(orderId: string): Promise<{
  order_status: string;
  order_amount: number;
  cf_order_id: string;
}> {
  const response = await getCashfreeClient().get(`/orders/${orderId}`);
  return response.data;
}

export function verifyCashfreeWebhook(
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  // Read SECRET_KEY at call time so Settings UI updates take effect without restart
  const secret = process.env.CASHFREE_SECRET_KEY ?? SECRET_KEY;
  const message = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');
  return expectedSignature === signature;
}
