import axios from 'axios';

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

const wa = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// ─── Text ────────────────────────────────────────────────────────────────────

export async function sendTextMessage(to: string, body: string): Promise<void> {
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body, preview_url: false },
  });
}

// ─── Audio (by media_id) ──────────────────────────────────────────────────────

export async function sendAudioMessage(to: string, mediaId: string): Promise<void> {
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'audio',
    audio: { id: mediaId },
  });
}

// ─── Audio (by URL — for hosted files) ───────────────────────────────────────

export async function sendAudioByUrl(to: string, audioUrl: string): Promise<void> {
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
  await wa.post('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption ? { caption } : {}),
    },
  });
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
  // Step 1: Get media URL
  const metaRes = await axios.get(
    `https://graph.facebook.com/${API_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  );
  const mediaUrl: string = metaRes.data.url;

  // Step 2: Download binary
  const fileRes = await axios.get(mediaUrl, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
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
