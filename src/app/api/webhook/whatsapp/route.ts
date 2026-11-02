import { NextRequest, NextResponse } from 'next/server';
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

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verified ✓');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST — Receive incoming messages ───────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Status updates (delivery receipts) — acknowledge and ignore
    if (value?.statuses?.length) {
      return NextResponse.json({ status: 'ok' });
    }

    if (!value?.messages?.length) {
      return NextResponse.json({ status: 'ok' });
    }

    const message = value.messages[0];
    const from: string = message.from; // patient phone e.g. "919876543210"

    // Dispatch conversation handler (async, don't hold webhook response)
    // WhatsApp requires 200 OK within 20s or it retries
    handleIncomingMessage(from, message).catch((err: unknown) => {
      console.error('[Webhook] handleIncomingMessage failed:', err);
    });

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err: unknown) {
    console.error('[Webhook] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
