import axios from 'axios';
import { getAppSettings } from '@/lib/settings';

const API_VERSION = 'v18.0';

export function getWhatsAppConfig() {
  const settings = getAppSettings();
  const phoneNumberId = settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = settings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
  const businessAccountId = settings.whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  
  // Log configuration status (without exposing full token)
  // Only log on first call or when config changes (check via environment)
  const lastLogged = (global as any).__whatsappConfigLogged;
  if (!lastLogged || lastLogged.token !== accessToken) {
    console.log('[WhatsApp Config] Status:', {
      phoneNumberId: phoneNumberId || 'MISSING',
      businessAccountId: businessAccountId || 'MISSING',
      accessTokenConfigured: !!accessToken,
      accessTokenLength: accessToken.length,
      accessTokenSuffix: accessToken.length > 10 ? '...' + accessToken.substring(accessToken.length - 10) : '...',
    });
    
    if (!phoneNumberId || !accessToken || !businessAccountId) {
      console.error('[WhatsApp Config] CRITICAL: Missing required environment variables', {
        hasPhoneNumberId: !!phoneNumberId,
        hasAccessToken: !!accessToken,
        hasBusinessAccountId: !!businessAccountId,
      });
    }
    (global as any).__whatsappConfigLogged = { token: accessToken };
  }
  
  return { phoneNumberId, accessToken, businessAccountId };
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
    // Extract Meta API error details safely without exposing token
    const metaError = axios.isAxiosError(err) ? err.response?.data?.error : null;
    
    console.error('[WhatsApp] Text message send FAILED:', {
      to,
      error: err instanceof Error ? err.message : String(err),
      httpStatus: axios.isAxiosError(err) ? err.response?.status : undefined,
      httpStatusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
      metaErrorMessage: metaError?.message,
      metaErrorType: metaError?.type,
      metaErrorCode: metaError?.code,
      response: axios.isAxiosError(err) && !metaError ? {
        status: err.response?.status,
        statusText: err.response?.statusText,
      } : undefined,
    });
    throw err;
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
    // Extract Meta API error details safely without exposing token
    const metaError = axios.isAxiosError(err) ? err.response?.data?.error : null;
    
    console.error('[WhatsApp] Audio message send FAILED:', {
      to,
      mediaId,
      error: err instanceof Error ? err.message : String(err),
      httpStatus: axios.isAxiosError(err) ? err.response?.status : undefined,
      httpStatusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
      metaErrorMessage: metaError?.message,
      metaErrorType: metaError?.type,
      metaErrorCode: metaError?.code,
      response: axios.isAxiosError(err) && !metaError ? {
        status: err.response?.status,
        statusText: err.response?.statusText,
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
    // Extract Meta API error details safely without exposing token
    const metaError = axios.isAxiosError(err) ? err.response?.data?.error : null;
    
    console.error('[WhatsApp] Image/GIF send FAILED:', {
      to,
      imageUrl: imageUrl.substring(0, 50) + '...',
      error: err instanceof Error ? err.message : String(err),
      httpStatus: axios.isAxiosError(err) ? err.response?.status : undefined,
      httpStatusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
      metaErrorMessage: metaError?.message,
      metaErrorType: metaError?.type,
      metaErrorCode: metaError?.code,
      response: axios.isAxiosError(err) && !metaError ? {
        status: err.response?.status,
        statusText: err.response?.statusText,
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

/**
 * Helper to fetch media URL from Meta Graph API with retry logic.
 * Meta API can be slow under load — we retry with exponential backoff.
 */
async function getMediaUrlWithRetry(
  mediaId: string,
  accessToken: string,
  requestId: string,
  maxRetries: number = 2,
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptNum = attempt + 1;
    const totalAttempts = maxRetries + 1;
    
    try {
      const attemptStart = Date.now();
      console.log(`[Media] [${requestId}] Fetching media URL from Meta API (attempt ${attemptNum}/${totalAttempts})...`);
      
      const metaRes = await axios.get(
        `https://graph.facebook.com/${API_VERSION}/${mediaId}`,
        { 
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 20000, // 20 second timeout per attempt
        },
      );
      
      const mediaUrl: string = metaRes.data?.url;
      if (!mediaUrl) {
        throw new Error('Media URL not found in Meta API response');
      }
      
      const attemptDuration = Date.now() - attemptStart;
      console.log(`[Media] [${requestId}] ✓ Media URL retrieved (attempt ${attemptNum}/${totalAttempts}, ${attemptDuration}ms)`);
      return mediaUrl;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Check if error is retryable (timeout, connection issues, 5xx)
      const isRetryable = 
        axios.isAxiosError(err) && (
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNABORTED' ||
          err.code === 'ENOTFOUND' ||
          (err.response?.status && err.response.status >= 500)
        );
      
      if (!isRetryable || attempt === maxRetries) {
        // Not retryable or last attempt — fail now
        // Extract Meta API error details safely without exposing token
        const metaError = axios.isAxiosError(err) ? err.response?.data?.error : null;
        console.error(`[Media] [${requestId}] ✗ Meta API request FAILED (attempt ${attemptNum}/${totalAttempts}):`, {
          mediaId: mediaId.substring(0, 20) + '...',
          code: axios.isAxiosError(err) ? err.code : 'UNKNOWN',
          status: axios.isAxiosError(err) ? err.response?.status : undefined,
          httpStatusText: axios.isAxiosError(err) ? err.response?.statusText : undefined,
          // Extract Meta's error details (safe to log — not sensitive)
          metaErrorMessage: metaError?.message,
          metaErrorType: metaError?.type,
          metaErrorCode: metaError?.code,
          error: lastError.message,
          isRetryable,
        });
        throw lastError;
      }
      
      // Retryable error and not last attempt — wait and retry
      const backoffMs = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s...
      console.warn(`[Media] [${requestId}] ⚠️ Attempt ${attemptNum}/${totalAttempts} timeout — retrying in ${backoffMs}ms (${lastError.message})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      console.log(`[Media] [${requestId}] → Retry attempt ${attemptNum + 1}/${totalAttempts} starting...`);
    }
  }
  
  throw lastError || new Error('Failed to fetch media URL after retries');
}

export async function downloadMediaFile(mediaId: string): Promise<Buffer> {
  const { accessToken } = getWhatsAppConfig();
  const startTime = Date.now();
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  console.log('[Media] ▶ Starting media download', {
    requestId,
    mediaId: mediaId.substring(0, 20) + '...',
  });
  
  try {
    // Step 1: Get media URL from Meta API (with retry)
    console.log(`[Media] [${requestId}] Step 1: Fetching media URL from Meta API...`);
    const mediaUrl = await getMediaUrlWithRetry(mediaId, accessToken, requestId, 2);
    const step1Duration = Date.now() - startTime;
    console.log(`[Media] [${requestId}] ✓ Step 1 complete (${step1Duration}ms)`);
    
    // Step 2: Download binary from media URL
    console.log(`[Media] [${requestId}] Step 2: Downloading audio file from CDN (${mediaUrl.substring(0, 50)}...)...`);
    const step2Start = Date.now();
    
    const fileRes = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout for file download
      maxContentLength: 25 * 1024 * 1024, // 25MB max (Whisper limit)
    });
    
    const buffer = Buffer.from(fileRes.data);
    const step2Duration = Date.now() - step2Start;
    const totalDuration = Date.now() - startTime;
    
    console.log(`[Media] [${requestId}] ✓ Download successful:`, {
      requestId,
      mediaId: mediaId.substring(0, 20) + '...',
      sizeBytes: buffer.length,
      sizeKB: Math.round(buffer.length / 1024),
      step1Ms: step1Duration,
      step2Ms: step2Duration,
      totalMs: totalDuration,
    });
    
    return buffer;
  } catch (err) {
    const duration = Date.now() - startTime;
    const axiosErr = axios.isAxiosError(err);
    
    // Extract Meta API error details safely without exposing token
    const metaError = axiosErr ? err.response?.data?.error : null;
    
    console.error(`[Media] [${requestId}] ✗ Download FAILED:`, {
      requestId,
      mediaId: mediaId.substring(0, 20) + '...',
      durationMs: duration,
      errorMessage: err instanceof Error ? err.message : String(err),
      errorCode: axiosErr ? err.code : undefined,
      httpStatus: axiosErr ? err.response?.status : undefined,
      httpStatusText: axiosErr ? err.response?.statusText : undefined,
      // Extract Meta's error details
      metaErrorMessage: metaError?.message,
      metaErrorType: metaError?.type,
      metaErrorCode: metaError?.code,
      isTimeout: axiosErr && (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED'),
      isNetwork: axiosErr && (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED'),
    });
    throw err;
  }
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
