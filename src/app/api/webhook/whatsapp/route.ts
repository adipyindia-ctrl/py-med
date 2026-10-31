import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/conversation-engine';

// ─── GET — WhatsApp webhook verification ────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
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
    const from: string = message.from;
    const msgType: string = message.type;

    console.log(`[Webhook] From: ${from}, Type: ${msgType}`);

    if (msgType === 'text' && message.text?.body) {
      await handleIncomingMessage(from, 'text', message.text.body);

    } else if (msgType === 'audio' && message.audio?.id) {
      console.log(`[Webhook] Voice note received, media_id: ${message.audio.id}`);
      await handleIncomingMessage(from, 'audio', undefined, message.audio.id);

    } else if (msgType === 'voice' && message.voice?.id) {
      // WhatsApp sometimes sends 'voice' type for voice notes
      console.log(`[Webhook] Voice message received, media_id: ${message.voice.id}`);
      await handleIncomingMessage(from, 'audio', undefined, message.voice.id);

    } else if (msgType === 'image' || msgType === 'document') {
      // Unsupported — politely inform
      await handleIncomingMessage(from, 'text', 'image sent');

    } else if (msgType === 'button' || msgType === 'interactive') {
      // Interactive button reply — extract the button ID first (preferred), then title
      const btnId =
        message.interactive?.button_reply?.id ??
        message.interactive?.list_reply?.id ??
        '';
      const btnTitle =
        message.button?.text ??
        message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        '';

      // Pass ID as the message body — conversation engine maps IDs like
      // GENDER_MALE, AGE_18_35 directly to structured values
      const btnText = btnId || btnTitle;
      if (btnText) {
        await handleIncomingMessage(from, 'text', btnText);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    // Always return 200 — prevents WhatsApp from retrying
    return NextResponse.json({ status: 'ok' });
  }
}
