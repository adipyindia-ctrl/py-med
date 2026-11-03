import { NextRequest, NextResponse, after } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/conversation-engine';
import { getAppSettings } from '@/lib/settings';

// ─── GET — WhatsApp webhook verification ────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const settings = getAppSettings();
  const verifyToken = settings.whatsappVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN;

  console.log(`[Webhook GET] mode=${mode}, token matches=${token === verifyToken}`);

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verification successful ✓');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[Webhook] Verification failed — token mismatch');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST — Receive incoming messages ───────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody = '';
  
  try {
    // Read raw body for signature verification
    rawBody = await request.text();

    // Handle empty body
    if (!rawBody || rawBody.trim() === '') {
      console.error('[Webhook] ❌ Empty request body');
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    // ─── Verify Meta webhook signature (X-Hub-Signature-256) ───────────────────
    const signature = request.headers.get('x-hub-signature-256') ?? '';
    const appSecretEnv = process.env.WHATSAPP_APP_SECRET;
    
    if (appSecretEnv && signature) {
      const { verifyWebhookSignature } = await import('@/lib/whatsapp/client');
      const isValid = verifyWebhookSignature(signature, rawBody, appSecretEnv);
      if (!isValid) {
        console.error('[Webhook] ❌ Invalid Meta signature — request rejected');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      console.log('[Webhook] ✓ Signature verified');
    } else if (!appSecretEnv) {
      console.warn('[Webhook] ⚠️  WHATSAPP_APP_SECRET not set — skipping signature verification (SECURITY RISK)');
    }

    // Parse JSON with proper error handling
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[Webhook] ❌ Invalid JSON body — parse error');
      // Log first 200 chars of body for debugging (without exposing full content)
      console.error('[Webhook] Body preview:', rawBody.substring(0, 200));
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate that body is an object
    if (!body || typeof body !== 'object') {
      console.error('[Webhook] ❌ Body is not a valid object');
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    const entry = (body as Record<string, unknown>)?.['entry'] as unknown[] | undefined;
    const changes = (entry?.[0] as Record<string, unknown>)?.['changes'] as unknown[] | undefined;
    const value = (changes?.[0] as Record<string, unknown>)?.['value'] as Record<string, unknown> | undefined;

    // Status updates (delivery receipts) — acknowledge and ignore
    if (Array.isArray(value?.['statuses']) && (value?.['statuses'] as unknown[]).length) {
      console.log('[Webhook] Status update received — acknowledging');
      return NextResponse.json({ status: 'ok' });
    }

    const messages = value?.['messages'] as unknown[] | undefined;
    if (!messages?.length) {
      console.log('[Webhook] No messages in payload — acknowledging');
      return NextResponse.json({ status: 'ok' });
    }

    const message = messages[0] as Record<string, unknown>;
    const from: string = message['from'] as string; // patient phone e.g. "919876543210"

    console.log(`[Webhook] 📨 Incoming message from ${from}`);

    // Parse the message fields needed by handleIncomingMessage
    const messageType = (message['type'] as string) as 'text' | 'audio' | 'image' | 'document';
    const textBody: string | undefined = (message['text'] as Record<string, string> | undefined)?.['body'];
    const audioMediaId: string | undefined = (message['audio'] as Record<string, string> | undefined)?.['id'];
    
    // Interactive replies (button / list) — treat as text with the reply ID or title
    let resolvedTextBody = textBody;
    if (!resolvedTextBody && message['type'] === 'interactive') {
      const interactive = message['interactive'] as Record<string, unknown> | undefined;
      const buttonReply = interactive?.['button_reply'] as Record<string, string> | undefined;
      const listReply = interactive?.['list_reply'] as Record<string, string> | undefined;
      resolvedTextBody = buttonReply?.['id'] ?? listReply?.['id'] ?? '';
      console.log(`[Webhook] Interactive reply: ${resolvedTextBody}`);
    }

    console.log(`[Webhook] Message type: ${messageType}, text: ${resolvedTextBody?.substring(0, 50) || '(no text)'}, audioId: ${audioMediaId || '(none)'}`);

    // Use after() to keep background work alive after webhook response
    // WhatsApp requires 200 OK within 20s, but background processing can continue
    after(async () => {
      try {
        console.log('[Webhook] ▶ Background handler started via after()');
        await handleIncomingMessage(from, messageType, resolvedTextBody, audioMediaId);
        console.log('[Webhook] ✓ Background handler completed');
      } catch (err: unknown) {
        console.error('[Webhook] ✗ Background handler failed:', err instanceof Error ? err.message : String(err));
      }
    });

    console.log('[Webhook] ✓ Message dispatched to background handler');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Webhook] ❌ POST error:', errorMessage);
    // Log body length for debugging (without exposing content)
    console.error('[Webhook] Body length:', rawBody?.length ?? 0);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
