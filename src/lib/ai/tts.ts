import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const WHATSAPP_API_VERSION = 'v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;

/**
 * Convert text to Hindi speech using OpenAI TTS,
 * upload the audio to WhatsApp media endpoint,
 * return the media_id for sending as audio message.
 */
export async function textToSpeechHindi(text: string): Promise<string | null> {
  const tmpPath = path.join('/tmp', `tts_${Date.now()}.mp3`);
  try {
    // Step 1: Generate audio via OpenAI TTS
    // Strip markdown symbols for cleaner speech
    const cleanText = text
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/🏥|✅|⚠️|🚨|📋|⏳|🔄|1️⃣|2️⃣|3️⃣/g, '')
      .replace(/\n+/g, '. ')
      .trim()
      .slice(0, 4000); // TTS limit

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',   // clear, neutral voice — works well for Hindi
      input: cleanText,
      speed: 0.95,
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);

    // Step 2: Upload to WhatsApp Media API
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', fs.createReadStream(tmpPath), {
      filename: 'voice_reply.mp3',
      contentType: 'audio/mpeg',
    });
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'audio/mpeg');

    const uploadRes = await axios.post(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          ...form.getHeaders(),
        },
      },
    );

    return uploadRes.data.id as string;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[TTS] Failed to generate/upload audio:', msg);
    return null;
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}
