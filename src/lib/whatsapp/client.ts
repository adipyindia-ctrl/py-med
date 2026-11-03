import axios from 'axios';
import { getAppSettings } from '@/lib/settings';

const API_VERSION = 'v18.0';

export function getWhatsAppConfig() {
  const settings = getAppSettings();
  const phoneNumberId = settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = settings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
  
  // Log configuration status (without exposing full token)
  console.log('[WhatsApp Config]', {
    phoneNumberId: phoneNumberId || 'MISSING',
    accessTokenConfigured: !!accessToken,
    accessTokenLength: accessToken.length,
    accessTokenPrefix: accessToken.substring(0, 10) + '...',
  });
  
  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp Config] CRITICAL: Missing required environment variables', {
      hasPhoneNumberId: !!phoneNumberId,
      hasAccessToken: !!accessToken,
    });
  }
  
  return { phoneNumberId, accessToken };
}

function getWaClient() {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();
  return axios.create({
    baseURL: `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Text ────────────────────────────────────────────────────────────────────

export async function sendTextMessage(to: string, body: string): Promise<void> {
  const wa = getWaClient();
  try {
    const response = await wa.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body, preview_url: false },
    });
    console.log('[WhatsApp] Text message sent successfully:', { to, messageId: response.data?.messages?.[0]?.id });
  } catch (err) {
    console.error('[WhatsApp] Text message send FAILED:', {
      to,
      error: err instanceof Error ? err.message : String(err),
      response: axios.isAxiosError(err) ? {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      } : undefined,
    });
    throw err; // Re-throw so caller knows it failed
  }
}

// ─── Audio (by media_id) ──────────────────────────────────────────────────────

export async function sendAudioMessage(to: string, mediaId: string): Promise<void> {
  const wa = getWaClient();
  try {
    const response = await wa.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'audio',
      audio: { id: mediaId },
    });
    console.log('[WhatsApp] Audio message sent successfully:', { to, mediaId, messageId: response.data?.messages?.[0]?.id });
  } catch (err) {
    console.error('[WhatsApp] Audio message send FAILED:', {
      to,
      mediaId,
      error: err instanceof Error ? err.message : String(err),
      response: axios.isAxiosError(err) ? {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      } : undefined,
    });
    throw err;
  }
}

// ─── Audio (by URL — for hosted files) ───────────────────────────────────────

export async function sendAudioByUrl(to: string, audioUrl: string): Promise<void> {
  const wa = getWaClient();
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'audio',
    audio: { link: audioUrl },
  });
}

// ─── Document ────────────────────────────────────────────────────────────────

export async function sendDocumentMessage(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string,
): Promise<void> {
  const wa = getWaClient();
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'document',
    document: { link: documentUrl, filename, caption: caption ?? '' },
  });
}

// ─── Image / GIF (by URL) ─────────────────────────────────────────────────────

/**
 * Sends an image (or animated GIF) by hosted URL.
 * WhatsApp renders GIFs as looping animations when the URL ends in .gif
 * or the server returns image/gif content-type.
 */
export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string,
): Promise<void> {
  const wa = getWaClient();
  try {
    const response = await wa.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption ? { caption } : {}),
      },
    });
    console.log('[WhatsApp] Image/GIF sent successfully:', { to, imageUrl, messageId: response.data?.messages?.[0]?.id });
  } catch (err) {
    console.error('[WhatsApp] Image/GIF send FAILED:', {
      to,
      imageUrl,
      error: err instanceof Error ? err.message : String(err),
      response: axios.isAxiosError(err) ? {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      } : undefined,
    });
    throw err;
  }
}

// ─── Interactive buttons ──────────────────────────────────────────────────────

/**
 * Sends a CTA URL interactive message — renders as a tappable button
 * that opens `url` in the browser. Supports an optional footer line.
 *
 * WhatsApp API reference: interactive > type: "cta_url"
 */
export async function sendCtaUrlButton(
  to: string,
  bodyText: string,
  buttonLabel: string,
  url: string,
  footerText?: string,
): Promise<void> {
  const wa = getWaClient();
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: bodyText },
      ...(footerText ? { footer: { text: footerText } } : {}),
      action: {
        name: 'cta_url',
        parameters: {
          display_text: buttonLabel,
          url,
        },
      },
    },
  });
}

/**
 * Sends an interactive list message — a scrollable picker with sections and rows.
 * WhatsApp renders this as a "View options" tap-sheet with row items.
 * Max 10 rows total, 1–10 sections.
 */
export async function sendListMessage(
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  footerText?: string,
): Promise<void> {
  const wa = getWaClient();
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      ...(footerText ? { footer: { text: footerText } } : {}),
      action: {
        button: buttonLabel,
        sections,
      },
    },
  });
}

export async function sendButtonMessage(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
): Promise<void> {
  const wa = getWaClient();
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

// ─── Media download ───────────────────────────────────────────────────────────

export async function downloadMediaFile(mediaId: string): Promise<Buffer> {
  const { accessToken } = getWhatsAppConfig();
  // Step 1: Get media URL
  const metaRes = await axios.get(
    `https://graph.facebook.com/${API_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const mediaUrl: string = metaRes.data.url;

  // Step 2: Download binary
  const fileRes = await axios.get(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer',
  });
  return Buffer.from(fileRes.data);
}

// ─── Webhook signature verification ──────────────────────────────────────────

export function verifyWebhookSignature(
  signature: string,
  body: string,
  secret: string,
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${expected}` === signature;
}
