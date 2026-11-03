import { prisma } from '@/lib/prisma/client';
import {
  sendTextMessage,
  sendAudioMessage,
  sendCtaUrlButton,
  sendButtonMessage,
  sendListMessage,
  sendImageMessage,
} from '@/lib/whatsapp/client';
import {
  transcribeAudioFromWhatsApp,
  extractSymptomsFromText,
  extractFieldFromVoice,
  generateAISummaryForDoctor,
} from '@/lib/ai/transcription';
import { runSafetyScreening } from '@/lib/ai/safety-screening';
import { createCashfreePaymentLink } from '@/lib/payment/cashfree';
import { textToSpeechHindi } from '@/lib/ai/tts';
import {
  detectLanguage,
  extractAge,
  extractGender,
  extractDuration,
  isNegativeResponse,
  getPrompt,
  STEP_GIFS,
  type DetectedLanguage,
} from '@/lib/ai/language';
import { CONSULTATION_FEE } from '@/lib/constants';
import { safeJsonParse } from '@/lib/utils';
import type { ConversationState, ConversationMessage } from '@/types';

// ─── Send GIF then text (non-blocking — GIF failure never blocks the message) ──

async function sendGif(to: string, gifKey: string): Promise<void> {
  const url = STEP_GIFS[gifKey];
  if (!url) return;
  try {
    await sendImageMessage(to, url);
    console.log('[ConversationEngine] GIF sent successfully:', { to, gifKey });
  } catch (err) {
    console.error('[ConversationEngine] GIF send failed (non-critical):', {
      to,
      gifKey,
      url,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Smart reply: sends text + optional TTS audio ─────────────────────────────

async function smartReply(
  to: string,
  textMsg: string,
  lang: DetectedLanguage,
  sendAudio: boolean,
): Promise<void> {
  // Always send text first (guaranteed delivery)
  try {
    await sendTextMessage(to, textMsg);
    console.log('[ConversationEngine] Text reply sent successfully to', to);
  } catch (err) {
    console.error('[ConversationEngine] CRITICAL: Text reply failed:', {
      to,
      messagePreview: textMsg.substring(0, 100),
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    // Don't throw - let the conversation continue even if one message fails
  }

  // If patient used voice, also send audio reply
  if (sendAudio) {
    try {
      const mediaId = await textToSpeechHindi(textMsg);
      if (mediaId) {
        await sendAudioMessage(to, mediaId);
        console.log('[ConversationEngine] Audio reply sent successfully to', to);
      }
    } catch (err) {
      console.error('[ConversationEngine] Audio reply failed (non-critical):', {
        to,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ─── Resolve incoming message to plain text ──────────────────────────────────

interface ResolvedInput {
  text: string;
  isVoice: boolean;
  lang: DetectedLanguage;
  rawTranscript?: string;
}

async function resolveInput(
  messageType: 'text' | 'audio' | 'image' | 'document',
  textBody?: string,
  audioMediaId?: string,
): Promise<ResolvedInput | null> {
  if (messageType === 'text' && textBody) {
    const lang = detectLanguage(textBody);
    return { text: textBody.trim(), isVoice: false, lang };
  }

  if (messageType === 'audio' && audioMediaId) {
    try {
      const { text, language } = await transcribeAudioFromWhatsApp(audioMediaId);
      if (!text) return null;
      // Map Whisper language code to our type
      const lang: DetectedLanguage =
        language === 'hi' || language === 'ur' ? 'hindi' : detectLanguage(text);
      return { text, isVoice: true, lang, rawTranscript: text };
    } catch (err) {
      console.error('[Voice] Transcription error:', err);
      return null;
    }
  }

  return null;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function handleIncomingMessage(
  from: string,
  messageType: 'text' | 'audio' | 'image' | 'document',
  textBody?: string,
  audioMediaId?: string,
): Promise<void> {
  console.log('[ConversationEngine] ▶ START handleIncomingMessage', { from, messageType, hasText: !!textBody, hasAudio: !!audioMediaId });
  
  try {
    // 1. Resolve input first so we have language for welcome message
    const input = await resolveInput(messageType, textBody, audioMediaId);
    if (!input) {
      console.warn('[ConversationEngine] Failed to resolve input, sending error message');
      try {
        await sendTextMessage(
          from,
          '⚠️ Aapka message samajh nahi aaya. Kripya text ya voice note mein dobara bhejein.',
        );
      } catch { /* ignore */ }
      return;
    }

    console.log('[ConversationEngine] Input resolved:', { text: input.text.substring(0, 50), isVoice: input.isVoice, lang: input.lang });

    // 2. Find or create patient
    let patient = await prisma.patient.findUnique({ where: { phone: from } });
    if (!patient) {
      console.log('[ConversationEngine] Creating new patient:', from);
      patient = await prisma.patient.create({ data: { name: 'Unknown', phone: from } });
    }

    // 3. Find active consultation
    let consultation = await prisma.consultation.findFirst({
      where: {
        patientId: patient.id,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'EMERGENCY'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. New session → create + send welcome
    if (!consultation) {
      console.log('[ConversationEngine] Creating new consultation for patient:', patient.id);
      consultation = await prisma.consultation.create({
        data: {
          patientId: patient.id,
          conversationState: 'COLLECTING_NAME',
          symptoms: '[]',
          conversationHistory: '[]',
          detectedLanguage: input.lang,
        },
      });

      const welcomeText = getPrompt('ask_name', input.lang);

      // Welcome GIF first — sets a warm, professional tone
      console.log('[ConversationEngine] Sending welcome message');
      await sendGif(from, 'welcome');
      await smartReply(from, welcomeText, input.lang, input.isVoice);
      console.log('[ConversationEngine] ✓ END handleIncomingMessage (welcome sent)');
      return;
    }

    const state = consultation.conversationState as ConversationState;
    const history = safeJsonParse<ConversationMessage[]>(consultation.conversationHistory, []);

    console.log('[ConversationEngine] Active consultation found:', { consultationId: consultation.id, state });

    // ── Sticky language — persist across session
    let { text, isVoice, lang } = input;
    const storedLang = (consultation as Record<string, unknown>).detectedLanguage as DetectedLanguage | undefined;

    // If current input looks English but we already know patient speaks Hindi/Hinglish, keep it
    if (lang === 'english' && storedLang && storedLang !== 'english') {
      lang = storedLang;
    }

    // Save newly detected non-English language on first detection
    if ((lang === 'hindi' || lang === 'hinglish') && storedLang !== lang) {
      await prisma.consultation.update({
        where: { id: consultation.id },
        data: { detectedLanguage: lang },
      });
    }

    // Log patient message
    history.push({ role: 'patient', message: text, timestamp: new Date() });

    // 5. Route to state handler
    console.log('[ConversationEngine] Routing to state handler:', state);
    await handleState(from, state, text, isVoice, lang, patient, consultation.id, history);
    console.log('[ConversationEngine] ✓ END handleIncomingMessage (state handler completed)');
  } catch (err) {
    console.error('[ConversationEngine] ✗ UNHANDLED ERROR in handleIncomingMessage:', {
      from,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

// ─── Reply helper that also persists history ─────────────────────────────────

async function reply(
  to: string,
  msg: string,
  lang: DetectedLanguage,
  isVoice: boolean,
  consultationId: string,
  history: ConversationMessage[],
): Promise<void> {
  history.push({ role: 'bot', message: msg, timestamp: new Date() });
  await prisma.consultation.update({
    where: { id: consultationId },
    data: { conversationHistory: JSON.stringify(history) },
  });
  await smartReply(to, msg, lang, isVoice);
}

// ─── Interactive step senders ─────────────────────────────────────────────────

/** Step 2: Age — 4-option list */
async function sendAgeStep(phone: string, name: string, lang: DetectedLanguage, isVoice: boolean): Promise<void> {
  const isHindi = lang === 'hindi';
  const prompt = getPrompt('ask_age', lang).replace('{name}', name);
  await sendGif(phone, 'ask_age');
  try {
    await sendListMessage(
      phone,
      prompt,
      isHindi ? '📅 Umar chunein' : '📅 Select Age',
      [{
        title: isHindi ? 'Apni umar chunein' : 'Choose your age range',
        rows: [
          { id: 'AGE_1_17',   title: '👶 1 – 17 years',   description: isHindi ? 'Bachcha / Kishor' : 'Child / Teen' },
          { id: 'AGE_18_35',  title: '🧑 18 – 35 years',  description: isHindi ? 'Yuva' : 'Young Adult' },
          { id: 'AGE_36_55',  title: '🧔 36 – 55 years',  description: isHindi ? 'Madhyam aayu' : 'Middle Age' },
          { id: 'AGE_56_120', title: '👴 56+ years',       description: isHindi ? 'Varishtha' : 'Senior' },
        ],
      }],
    );
  } catch {
    await smartReply(phone, prompt, lang, isVoice);
  }
}

/** Step 3: Gender — 2 quick-reply buttons */
async function sendGenderStep(phone: string, lang: DetectedLanguage, isVoice: boolean): Promise<void> {
  const prompt = getPrompt('ask_gender', lang);
  await sendGif(phone, 'ask_gender');
  try {
    await sendButtonMessage(phone, prompt, [
      { id: 'GENDER_MALE',   title: '👨 Male' },
      { id: 'GENDER_FEMALE', title: '👩 Female' },
    ]);
  } catch {
    await smartReply(phone, prompt, lang, isVoice);
  }
}

/** Step 4: Duration — list with common ranges */
async function sendDurationStep(phone: string, lang: DetectedLanguage, isVoice: boolean): Promise<void> {
  const isHindi = lang === 'hindi';
  const prompt = getPrompt('ask_duration', lang);
  await sendGif(phone, 'ask_duration');
  try {
    await sendListMessage(
      phone,
      prompt,
      isHindi ? '⏱️ Samay chunein' : '⏱️ Select Duration',
      [{
        title: isHindi ? 'Kitne samay se?' : 'How long?',
        rows: [
          { id: 'DUR_TODAY', title: isHindi ? '🌅 Aaj se'       : '🌅 Today',           description: '' },
          { id: 'DUR_1D',    title: isHindi ? '📅 1 din se'      : '📅 1 day',           description: '' },
          { id: 'DUR_2_3D',  title: isHindi ? '📅 2–3 din se'    : '📅 2–3 days',        description: '' },
          { id: 'DUR_1W',    title: isHindi ? '📆 1 hafte se'    : '📆 ~1 week',         description: '' },
          { id: 'DUR_2W',    title: isHindi ? '📆 2 hafte se'    : '📆 ~2 weeks',        description: '' },
          { id: 'DUR_1M',    title: isHindi ? '🗓️ 1 mahine se'  : '🗓️ ~1 month',       description: '' },
          { id: 'DUR_LONG',  title: isHindi ? '⌛ 1 mahine se zyada' : '⌛ Over 1 month', description: '' },
        ],
      }],
    );
  } catch {
    await smartReply(phone, prompt, lang, isVoice);
  }
}

/** Step 5: Allergies — Yes / No buttons */
async function sendAllergyStep(phone: string, lang: DetectedLanguage, isVoice: boolean): Promise<void> {
  const prompt = getPrompt('ask_allergies', lang);
  const isHindi = lang === 'hindi';
  await sendGif(phone, 'ask_allergies');
  try {
    await sendButtonMessage(phone, prompt, [
      { id: 'ALLERGY_YES', title: isHindi ? '✅ Haan, hai'  : '✅ Yes' },
      { id: 'ALLERGY_NO',  title: isHindi ? '❌ Nahi hai'  : '❌ No' },
    ]);
  } catch {
    await smartReply(phone, prompt, lang, isVoice);
  }
}

/** Step 6: Current medicines — Yes / No buttons */
async function sendMedicinesStep(phone: string, lang: DetectedLanguage, isVoice: boolean): Promise<void> {
  const prompt = getPrompt('ask_medicines', lang);
  const isHindi = lang === 'hindi';
  await sendGif(phone, 'ask_medicines');
  try {
    await sendButtonMessage(phone, prompt, [
      { id: 'MED_YES', title: isHindi ? '✅ Haan' : '✅ Yes' },
      { id: 'MED_NO',  title: isHindi ? '❌ Nahi' : '❌ No' },
    ]);
  } catch {
    await smartReply(phone, prompt, lang, isVoice);
  }
}

// ─── Duration ID → human-readable label map ───────────────────────────────────
const DURATION_MAP: Record<string, string> = {
  DUR_TODAY: 'Aaj se (same day)',
  DUR_1D:    '1 din se',
  DUR_2_3D:  '2-3 din se',
  DUR_1W:    '1 hafte se',
  DUR_2W:    '2 hafte se',
  DUR_1M:    '1 mahine se',
  DUR_LONG:  '1 mahine se zyada',
};

// ─── State machine ────────────────────────────────────────────────────────────

async function handleState(
  phone: string,
  state: ConversationState,
  userText: string,
  isVoice: boolean,
  lang: DetectedLanguage,
  patient: { id: string; name: string; phone: string },
  consultationId: string,
  history: ConversationMessage[],
): Promise<void> {
  const r = (msg: string) => reply(phone, msg, lang, isVoice, consultationId, history);

  switch (state) {
    // ── NAME ──────────────────────────────────────────────────────────────────
    case 'COLLECTING_NAME': {
      let name = userText.trim();

      // For voice input, always use GPT — Whisper may produce Hindi/regional
      // script, and short names won't match Latin-only regex patterns.
      if (isVoice) {
        const extracted = await extractFieldFromVoice(userText, 'name');
        if (extracted && extracted.toUpperCase() !== 'NONE' && extracted.length >= 2) {
          name = extracted;
        }
      } else {
        // Text input: strip "Mera naam X hai" style phrases.
        // Unicode-aware pattern (\p{L} matches any letter in any script).
        const namePatterns = [
          /(?:mera naam|my name is|main|i am|i'm|naam hai|name is)[:\s]+([\p{L}\s]+)/iu,
          /(?:naam)[:\s]+([\p{L}\s]+)/iu,
        ];
        for (const p of namePatterns) {
          const m = name.match(p);
          if (m) {
            name = m[1].replace(/\b(hai|he|is|hoon|hun)\b.*$/i, '').trim();
            break;
          }
        }
      }

      if (!name || name.length < 2 || name.toUpperCase() === 'NONE') {
        await r(getPrompt('name_not_understood', lang));
        return;
      }

      // Capitalise only Latin-script names — Devanagari/Tamil have no case.
      const hasOnlyLatinChars = /^[\p{ASCII}\s]+$/u.test(name);
      if (hasOnlyLatinChars) {
        name = name
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }

      await prisma.patient.update({ where: { id: patient.id }, data: { name } });
      await updateState(consultationId, 'COLLECTING_AGE');

      await sendAgeStep(phone, name, lang, isVoice);
      break;
    }

    // ── AGE ───────────────────────────────────────────────────────────────────
    case 'COLLECTING_AGE': {
      // Map list-row IDs and button titles → representative midpoint ages
      const ageRangeMap: Record<string, number> = {
        'AGE_1_17':   10, '1 – 17 years': 10, '1–17': 10, '1-17': 10,
        'AGE_18_35':  25, '18 – 35 years': 25, '18–35': 25, '18-35': 25,
        'AGE_36_55':  45, '36 – 55 years': 45, '36–55': 45, '36-55': 45,
        'AGE_56_120': 65, '56 – 120 years': 65, '56–120': 65, '56-120': 65,
      };

      const trimmed = userText.trim();
      let age: number | null = ageRangeMap[trimmed.toUpperCase()] ?? ageRangeMap[trimmed] ?? null;

      // Exact number (typed or from voice)
      if (age === null) age = extractAge(userText);

      // Partial title match (list row title arrives as display text)
      if (age === null) {
        for (const [key, val] of Object.entries(ageRangeMap)) {
          if (trimmed.includes(key) || key.includes(trimmed)) { age = val; break; }
        }
      }

      // Voice: always try GPT — handles Hindi words ("pacchis", "पच्चीस"),
      // short utterances, and any script Whisper may have transcribed.
      if (age === null && isVoice) {
        const extracted = await extractFieldFromVoice(userText, 'age');
        const parsed = parseInt(extracted, 10);
        if (!isNaN(parsed)) age = parsed;
      }

      // Text fallback: GPT for ambiguous typed input (e.g. "around 30", "thirty")
      if (age === null && !isVoice) {
        const extracted = await extractFieldFromVoice(userText, 'age');
        const parsed = parseInt(extracted, 10);
        if (!isNaN(parsed)) age = parsed;
      }

      if (age === null || age < 1 || age > 120) {
        // Re-send the list so they can just tap
        await sendAgeStep(phone, patient.name, lang, isVoice);
        return;
      }

      await prisma.patient.update({ where: { id: patient.id }, data: { age } });
      await updateState(consultationId, 'COLLECTING_GENDER');
      await sendGenderStep(phone, lang, isVoice);
      break;
    }

    // ── GENDER ────────────────────────────────────────────────────────────────
    case 'COLLECTING_GENDER': {
      const upper = userText.trim().toUpperCase();
      let gender: 'MALE' | 'FEMALE' | 'OTHER' | null = null;

      // Button ID or emoji-prefixed title (highest confidence — exact match)
      if (upper === 'GENDER_MALE' || upper.includes('👨') || upper === 'MALE' || upper === '👨 MALE') {
        gender = 'MALE';
      } else if (upper === 'GENDER_FEMALE' || upper.includes('👩') || upper === 'FEMALE' || upper === '👩 FEMALE') {
        gender = 'FEMALE';
      } else {
        // Keyword-based extraction (handles "mard", "aurat", "ladka" etc.)
        gender = extractGender(userText);
      }

      // GPT fallback for both voice AND ambiguous text — handles freeform
      // sentences ("main ek aadmi hoon"), Devanagari ("पुरुष"), etc.
      if (!gender) {
        const extracted = await extractFieldFromVoice(userText, 'gender');
        if (['MALE', 'FEMALE', 'OTHER'].includes(extracted.toUpperCase())) {
          gender = extracted.toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER';
        }
      }

      if (!gender) {
        // Re-send buttons — no typing needed
        await sendGenderStep(phone, lang, isVoice);
        return;
      }

      await prisma.patient.update({ where: { id: patient.id }, data: { gender } });
      await updateState(consultationId, 'COLLECTING_SYMPTOMS_DURATION');
      await sendDurationStep(phone, lang, isVoice);
      break;
    }

    // ── DURATION ──────────────────────────────────────────────────────────────
    case 'COLLECTING_SYMPTOMS_DURATION': {
      // List-row ID takes priority
      let duration: string = DURATION_MAP[userText.trim().toUpperCase()] ?? '';

      // Voice or freeform text fallback
      if (!duration) {
        duration = extractDuration(userText);
        if (isVoice && userText.length > 30) {
          duration = await extractFieldFromVoice(userText, 'duration');
        }
        if (!isVoice && !duration) {
          const m = userText.match(
            /(\d+\s*(?:din|day|days|ghante|hour|hours|week|hafte|month|mahine)s?(?:\s*se)?|[a-zA-Z]+\s*din\s*se|kal\s*se|aaj\s*se|kaafi\s*time\s*se)/i
          );
          if (m) duration = m[0];
        }
      }

      // Nothing captured → re-send list
      if (!duration || duration.length < 2) {
        await sendDurationStep(phone, lang, isVoice);
        return;
      }

      await prisma.consultation.update({
        where: { id: consultationId },
        data: { symptomsDuration: duration },
      });
      await updateState(consultationId, 'COLLECTING_ALLERGIES');
      await sendAllergyStep(phone, lang, isVoice);
      break;
    }

    // ── ALLERGIES ─────────────────────────────────────────────────────────────
    case 'COLLECTING_ALLERGIES': {
      const upper = userText.trim().toUpperCase();
      let allergies: string | null = null;
      let needsDetails = false;

      if (upper === 'ALLERGY_NO' || isNegativeResponse(userText)) {
        allergies = null; // confirmed none
      } else if (upper === 'ALLERGY_YES') {
        needsDetails = true; // patient tapped "Yes" — ask for details
      } else if (isVoice) {
        const extracted = await extractFieldFromVoice(userText, 'allergies');
        allergies = extracted === 'NONE' ? null : extracted;
      } else {
        allergies = userText.trim() || null;
      }

      if (needsDetails) {
        await r(getPrompt('allergy_detail', lang));
        return;
      }

      await prisma.patient.update({ where: { id: patient.id }, data: { allergies } });
      await updateState(consultationId, 'COLLECTING_CURRENT_MEDICINES');
      await sendMedicinesStep(phone, lang, isVoice);
      break;
    }

    // ── MEDICINES ─────────────────────────────────────────────────────────────
    case 'COLLECTING_CURRENT_MEDICINES': {
      const upper = userText.trim().toUpperCase();
      let medicines: string | null = null;
      let needsDetails = false;

      if (upper === 'MED_NO' || isNegativeResponse(userText)) {
        medicines = null;
      } else if (upper === 'MED_YES') {
        needsDetails = true;
      } else if (isVoice) {
        const extracted = await extractFieldFromVoice(userText, 'medicines');
        medicines = extracted === 'NONE' ? null : extracted;
      } else {
        medicines = userText.trim() || null;
      }

      if (needsDetails) {
        await r(getPrompt('medicine_detail', lang));
        return;
      }

      await prisma.patient.update({
        where: { id: patient.id },
        data: { currentMedicines: medicines },
      });
      await updateState(consultationId, 'COLLECTING_SYMPTOMS');
      await sendGif(phone, 'ask_symptoms');
      await r(getPrompt('ask_symptoms', lang));
      break;
    }

    // ── SYMPTOMS (voice OR text) ───────────────────────────────────────────────
    case 'COLLECTING_SYMPTOMS': {
      const symptomsText = userText.trim();

      // Use GPT to extract clean symptoms list
      const { symptoms } = await extractSymptomsFromText(symptomsText);
      const finalSymptoms = symptoms.length > 0 ? symptoms : [symptomsText];

      await prisma.consultation.update({
        where: { id: consultationId },
        data: {
          symptoms: JSON.stringify(finalSymptoms),
          voiceTranscript: symptomsText,
        },
      });

      await updateState(consultationId, 'SAFETY_SCREENING');
      await sendGif(phone, 'processing');
      await r(getPrompt('processing', lang));

      // Run async safety + payment
      await runSafetyAndProceed(phone, lang, isVoice, patient, consultationId, history);
      break;
    }

    // ── AWAITING PAYMENT ──────────────────────────────────────────────────────
    case 'AWAITING_PAYMENT': {
      await r(getPrompt('awaiting_payment', lang));
      break;
    }

    // ── SAFETY SCREENING (processing) ─────────────────────────────────────────
    case 'SAFETY_SCREENING': {
      await r(getPrompt('processing', lang));
      break;
    }

    default:
      break;
  }
}

// ─── Safety screening + payment ───────────────────────────────────────────────

async function runSafetyAndProceed(
  phone: string,
  lang: DetectedLanguage,
  isVoice: boolean,
  patient: { id: string; name: string; phone: string },
  consultationId: string,
  history: ConversationMessage[],
): Promise<void> {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { patient: true },
  });
  if (!consultation) return;

  const symptoms = safeJsonParse<string[]>(consultation.symptoms, []);
  const screenResult = await runSafetyScreening(symptoms, consultation.voiceTranscript ?? '');

  await prisma.consultation.update({
    where: { id: consultationId },
    data: { urgencyLevel: screenResult.urgencyLevel },
  });

  // EMERGENCY path
  if (screenResult.isEmergency) {
    await prisma.consultation.update({
      where: { id: consultationId },
      data: { status: 'EMERGENCY', conversationState: 'COMPLETED' },
    });
    await sendGif(phone, 'emergency');
    await reply(phone, getPrompt('emergency', lang), lang, isVoice, consultationId, history);
    return;
  }

  // Move to payment
  await updateState(consultationId, 'AWAITING_PAYMENT');
  await prisma.consultation.update({
    where: { id: consultationId },
    data: { status: 'PENDING' },
  });

  try {
    const linkRes = await createCashfreePaymentLink({
      amount: CONSULTATION_FEE,
      customerId: patient.id,
      customerName: consultation.patient.name,
      customerPhone: phone,
      consultationId,
    });

    await prisma.payment.create({
      data: {
        consultationId,
        amount: CONSULTATION_FEE,
        cashfreeOrderId: linkRes.link_id,
        status: 'PENDING',
      },
    });

    const paymentLink = linkRes.link_url;

    // Build payment message from the single payment_intro prompt
    const isHindi = lang === 'hindi';
    const paymentBody = getPrompt('payment_intro', lang).replace('{fee}', String(CONSULTATION_FEE));
    const paymentButtonLabel = isHindi ? '💳 अभी भुगतान करें' : '💳 Pay Now';
    const paymentFooter = '🔒 Secured by Cashfree';

    // Record in conversation history
    history.push({ role: 'bot', message: paymentBody, timestamp: new Date() });
    await prisma.consultation.update({
      where: { id: consultationId },
      data: { conversationHistory: JSON.stringify(history) },
    });

    // Send image then CTA button
    await sendGif(phone, 'payment_intro');
    try {
      await sendCtaUrlButton(phone, paymentBody, paymentButtonLabel, paymentLink, paymentFooter);
    } catch {
      // Fallback: plain text with link
      await smartReply(phone, `${paymentBody}\n\n🔗 ${paymentLink}`, lang, isVoice);
    }
  } catch (err) {
    console.error('[Payment] Payment link creation failed:', err);
    const errMsg =
      lang === 'hindi'
        ? '⚠️ Payment link banana mein dikkat aayi. Kripya support se sampark karein.'
        : '⚠️ Payment link generate karne mein problem aayi. Please contact support.';
    await reply(phone, errMsg, lang, isVoice, consultationId, history);
  }
}

// ─── State updater ────────────────────────────────────────────────────────────

async function updateState(
  consultationId: string,
  state: ConversationState,
): Promise<void> {
  await prisma.consultation.update({
    where: { id: consultationId },
    data: { conversationState: state },
  });
}

// ─── Post-payment: send confirmation (called from payment webhook) ─────────────

export async function sendPaymentConfirmation(
  phone: string,
  lang: DetectedLanguage = 'hinglish',
  isVoice = false,
): Promise<void> {
  const msg = getPrompt('payment_done', lang);
  await sendGif(phone, 'payment_done');
  await smartReply(phone, msg, lang, isVoice);
}

// ─── Post-prescription: send to patient (called from prescription API) ────────

export async function sendPrescriptionReady(
  phone: string,
  prescriptionUrl: string,
  lang: DetectedLanguage = 'hinglish',
  isVoice = false,
): Promise<void> {
  const intro = getPrompt('prescription_ready', lang);
  const msg = `${intro}\n\n📋 ${prescriptionUrl}`;
  await sendGif(phone, 'prescription_ready');
  await smartReply(phone, msg, lang, isVoice);
}
