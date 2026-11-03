import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { downloadMediaFile } from '@/lib/whatsapp/client';

/** Create an OpenAI client at call time so Settings UI key changes take effect without restart */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  return new OpenAI({ 
    apiKey,
    timeout: 60000, // 60 second timeout for Whisper API
    maxRetries: 2,   // Retry twice on failure
  });
}

export interface TranscriptResult {
  text: string;
  language: string; // e.g. 'hi', 'en'
}

/**
 * Download audio from WhatsApp and transcribe via Whisper.
 * Whisper auto-detects language — returns transcript + detected language code.
 */
export async function transcribeAudioFromWhatsApp(
  mediaId: string,
): Promise<TranscriptResult> {
  const startTime = Date.now();
  console.log('[Whisper] Starting transcription for mediaId:', mediaId.substring(0, 20) + '...');
  
  let tmpPath: string | null = null;
  
  try {
    // Step 1: Download audio from WhatsApp
    console.log('[Whisper] Step 1: Downloading audio from WhatsApp...');
    const audioBuffer = await downloadMediaFile(mediaId);
    console.log('[Whisper] Audio downloaded successfully, size:', audioBuffer.length, 'bytes');
    
    // Step 2: Save to temp file
    tmpPath = path.join(os.tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.ogg`);
    fs.writeFileSync(tmpPath, audioBuffer);
    console.log('[Whisper] Audio saved to temp file:', tmpPath);
    
    // Step 3: Transcribe with OpenAI Whisper
    console.log('[Whisper] Step 2: Sending to OpenAI Whisper API...');
    const openai = getOpenAIClient();
    
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath) as unknown as File,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    const text =
      typeof result === 'string'
        ? result
        : (result as { text: string; language?: string }).text;

    const language =
      typeof result === 'object' && 'language' in result
        ? ((result as { language: string }).language ?? 'hi')
        : 'hi';

    const duration = Date.now() - startTime;
    console.log('[Whisper] Transcription successful:', {
      mediaId: mediaId.substring(0, 20) + '...',
      language,
      textLength: text.length,
      textPreview: text.substring(0, 50) + '...',
      durationMs: duration,
    });

    return { text: text.trim(), language };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[Whisper] Transcription FAILED:', {
      mediaId: mediaId.substring(0, 20) + '...',
      durationMs: duration,
      error: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : undefined,
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : undefined,
    });
    throw err;
  } finally {
    // Always clean up temp file
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
        console.log('[Whisper] Temp file cleaned up:', tmpPath);
      } catch (cleanupErr) {
        console.warn('[Whisper] Failed to delete temp file:', tmpPath, cleanupErr);
      }
    }
  }
}

/**
 * Extract structured symptoms from any text/transcript using GPT.
 * Handles Hindi, English, Hinglish.
 */
export async function extractSymptomsFromText(transcript: string): Promise<{
  symptoms: string[];
  summary: string;
}> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a medical AI assistant. The patient may speak in Hindi, English, or Hinglish.
Extract their medical symptoms and return ONLY valid JSON (no markdown):
{
  "symptoms": ["symptom1 in English", "symptom2 in English"],
  "summary": "One sentence English clinical summary"
}`,
      },
      {
        role: 'user',
        content: `Patient said: "${transcript}"`,
      },
    ],
    temperature: 0.2,
    max_tokens: 400,
  });

  const content = response.choices[0].message.content ?? '{}';
  try {
    const parsed = JSON.parse(content);
    return {
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [transcript],
      summary: parsed.summary ?? transcript,
    };
  } catch {
    return { symptoms: [transcript], summary: transcript };
  }
}

/**
 * AI-powered extraction of a specific field from voice input.
 * Used to extract age, gender, duration, name etc. from freeform speech.
 */
export async function extractFieldFromVoice(
  transcript: string,
  field: 'name' | 'age' | 'gender' | 'duration' | 'allergies' | 'medicines' | 'symptoms',
): Promise<string> {
  const openai = getOpenAIClient();
  const fieldInstructions: Record<string, string> = {
    name: 'Extract the person\'s full name. Return only the name, nothing else.',
    age: 'Extract the age as a number only (e.g. "35"). Return only the digits.',
    gender: 'Extract gender. Return exactly one of: MALE, FEMALE, OTHER',
    duration: 'Extract how long they have had symptoms (e.g. "3 days", "2 ghante"). Return the duration phrase only.',
    allergies: 'Extract any medicine or food allergies mentioned. If none, return "NONE".',
    medicines: 'Extract any medicines currently being taken. If none, return "NONE".',
    symptoms: 'List all medical symptoms mentioned, comma separated in English.',
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You extract specific information from patient voice transcripts (Hindi/English/Hinglish).
Task: ${fieldInstructions[field]}
Return ONLY the extracted value, no explanation.`,
      },
      {
        role: 'user',
        content: transcript,
      },
    ],
    temperature: 0.1,
    max_tokens: 100,
  });

  return (response.choices[0].message.content ?? '').trim();
}

/**
 * Generate AI clinical summary for doctor dashboard.
 */
export async function generateAISummaryForDoctor(consultation: {
  symptoms: string[];
  symptomsDuration?: string;
  age?: number;
  gender?: string;
  allergies?: string;
  currentMedicines?: string;
  voiceTranscript?: string;
}): Promise<string> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a clinical assistant. Write a concise structured case summary for a doctor.
Sections: Chief Complaint | Duration | Age/Gender | Allergies | Current Medications.
Be brief and clinical. Max 150 words. English only.`,
      },
      {
        role: 'user',
        content: JSON.stringify(consultation),
      },
    ],
    temperature: 0.3,
    max_tokens: 300,
  });

  return response.choices[0].message.content ?? 'Summary not available.';
}
