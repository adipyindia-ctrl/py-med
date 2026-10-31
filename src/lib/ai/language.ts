/**
 * Detect language and extract structured data from free-form voice/text input.
 * Handles Hindi, English, Hinglish (mixed).
 */

export type DetectedLanguage = 'hindi' | 'english' | 'hinglish';

/** Rough language detector — works for Hinglish/Roman Hindi */
export function detectLanguage(text: string): DetectedLanguage {
  const hindiWords = [
    'hai', 'hain', 'mujhe', 'mera', 'meri', 'mere', 'aur', 'bhi', 'nahi',
    'ho', 'kya', 'kar', 'raha', 'rahi', 'din', 'se', 'sar', 'dard',
    'bukhar', 'dawa', 'doctor', 'bimari', 'takleef', 'pet', 'khasi',
    'naak', 'band', 'subah', 'raat', 'shaam', 'kal', 'aaj', 'abhi',
    'bahut', 'thoda', 'zyada', 'kam', 'acha', 'theek', 'bilkul',
    'ji', 'haan', 'na', 'nahi', 'toh', 'woh', 'yeh', 'koi', 'kuch',
  ];

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const hindiCount = words.filter(w => hindiWords.includes(w)).length;
  const ratio = hindiCount / Math.max(words.length, 1);

  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (hasDevanagari) return 'hindi';

  if (ratio > 0.3) return 'hinglish';
  if (ratio > 0.1) return 'hinglish';
  return 'english';
}

/** Extract age from any text (e.g. "meri umar 35 saal hai" → 35) */
export function extractAge(text: string): number | null {
  const patterns = [
    /\b(\d{1,3})\s*(?:saal|sal|year|yr|age|umar|umra|varsh)\b/i,
    /(?:umar|age|umra)\s*(?:hai|is|:)?\s*(\d{1,3})/i,
    /\b(\d{1,3})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const age = parseInt(m[1], 10);
      if (age >= 1 && age <= 120) return age;
    }
  }
  return null;
}

/** Extract gender from any text */
export function extractGender(text: string): 'MALE' | 'FEMALE' | 'OTHER' | null {
  const lower = text.toLowerCase().trim();

  const maleWords = [
    'male', 'man', 'boy', 'mard', 'aadmi', 'purush', 'ladka',
    'bhai', 'uncle', 'gent', '1', 'ek', 'one', 'पुरुष', 'मर्द',
  ];
  const femaleWords = [
    'female', 'woman', 'girl', 'aurat', 'mahila', 'stri', 'ladki',
    'behen', 'aunty', '2', 'do', 'two', 'महिला', 'औरत',
  ];
  const otherWords = ['other', 'others', 'transgender', 'trans', '3', 'teen', 'three'];

  if (maleWords.some(w => lower.includes(w))) return 'MALE';
  if (femaleWords.some(w => lower.includes(w))) return 'FEMALE';
  if (otherWords.some(w => lower.includes(w))) return 'OTHER';
  return null;
}

/** Check if user said "no" / "nahi" / "nahin" etc. */
export function isNegativeResponse(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const negatives = [
    'no', 'nahi', 'nahin', 'nai', 'nein', 'na', 'nope',
    'nothing', 'none', 'kuch nahi', 'koi nahi', 'bilkul nahi',
    'नहीं', 'ना',
  ];
  return negatives.some(n => lower === n || lower.startsWith(n + ' ') || lower.endsWith(' ' + n));
}

/** Extract duration from text (e.g. "teen din se", "2 days ago", "kal se") */
export function extractDuration(text: string): string {
  const lower = text.toLowerCase().trim();
  if (lower.length < 50) return text.trim();
  const m = lower.match(
    /(\d+\s*(?:din|day|days|ghante|hour|hours|week|hafte|month|mahine|saal|year)s?(?:\s*se)?|kal\s*se|aaj\s*se|subah\s*se|raat\s*se|kaafi\s*time\s*se)/i
  );
  return m ? m[0] : text.trim();
}

// ─── Step GIFs ────────────────────────────────────────────────────────────────
// Publicly-accessible images shown alongside each conversation step.
// Using reliable, medical-themed images from Unsplash (static, no expiry).
export const STEP_GIFS: Record<string, string> = {
  // Warm welcome — doctor with stethoscope
  welcome:
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80',
  // Name collection — friendly patient registration
  ask_age:
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=80',
  // Gender — doctor consulting patient
  ask_gender:
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80',
  // Symptoms duration — calendar / time
  ask_duration:
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&q=80',
  // Allergies — medication pills
  ask_allergies:
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&q=80',
  // Current medicines — pharmacy / prescription
  ask_medicines:
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&q=80',
  // Describe symptoms — stethoscope on chest
  ask_symptoms:
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&q=80',
  // AI processing — medical technology
  processing:
    'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&q=80',
  // Payment — secure online transaction
  payment_intro:
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80',
  // Payment success — celebration / checkmark
  payment_done:
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80',
  // Prescription ready — doctor writing prescription
  prescription_ready:
    'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=600&q=80',
  // Emergency — ambulance / urgent
  emergency:
    'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=600&q=80',
};

// ─── Language-aware prompts ───────────────────────────────────────────────────

export function getPrompt(key: string, lang: DetectedLanguage): string {
  const prompts: Record<string, Record<DetectedLanguage, string>> = {

    // ── Step 1: Welcome + Name ────────────────────────────────────────────────
    ask_name: {
      hindi:
        '🏥 *MediVoice AI में आपका स्वागत है!*\n\n' +
        'मैं आपका AI health assistant हूँ।\n' +
        'घर बैठे doctor से consult करें — बिल्कुल safe और private।\n\n' +
        '👤 सबसे पहले, अपना *पूरा नाम* बताएं:',
      english:
        '🏥 *Welcome to MediVoice AI!*\n\n' +
        'I am your personal AI health assistant.\n' +
        'Consult a licensed doctor from home — safe, private & easy.\n\n' +
        '👤 To get started, please tell me your *full name*:',
      hinglish:
        '🏥 *MediVoice AI mein aapka swagat hai!*\n\n' +
        'Main aapka AI health assistant hoon.\n' +
        'Ghar baithe doctor se consult karein — safe aur private.\n\n' +
        '👤 Shuru karte hain — apna *poora naam* batayein:',
    },

    // ── Step 2: Age ───────────────────────────────────────────────────────────
    ask_age: {
      hindi:
        '✅ Shukriya, *{name}*!\n\n' +
        '🎂 Apna *age range* select karein:',
      english:
        '✅ Great, *{name}*!\n\n' +
        '🎂 Please select your *age range*:',
      hinglish:
        '✅ Shukriya, *{name}*!\n\n' +
        '🎂 Apna *age range* select karein:',
    },

    // ── Step 3: Gender ────────────────────────────────────────────────────────
    ask_gender: {
      hindi:
        '👤 Aap *Male* hain ya *Female*?\n\n' +
        'Neeche button press karein 👇',
      english:
        '👤 Please select your *gender* 👇',
      hinglish:
        '👤 Apna *gender* select karein 👇',
    },

    // ── Step 4: Symptoms duration ─────────────────────────────────────────────
    ask_duration: {
      hindi:
        '⏱️ Yeh takleef *kitne time se* hai?\n\n' +
        'Neeche se choose karein 👇',
      english:
        '⏱️ *How long* have you had these symptoms?\n\n' +
        'Select from the options below 👇',
      hinglish:
        '⏱️ Yeh problem *kitne time se* hai?\n\n' +
        'Neeche se select karein 👇',
    },

    // ── Step 5: Allergies ─────────────────────────────────────────────────────
    ask_allergies: {
      hindi:
        '💊 Kya aapko kisi *dawa ya khaane* se allergy hai?\n\n' +
        '_Jaise: Penicillin, Aspirin, Badam, Doodh_',
      english:
        '💊 Do you have any *medicine or food allergies*?\n\n' +
        '_Example: Penicillin, Aspirin, Nuts, Dairy_',
      hinglish:
        '💊 Koi *medicine ya food allergy* hai aapko?\n\n' +
        '_Jaise: Penicillin, Aspirin, Nuts, Milk_',
    },

    // ── Step 5b: Allergy details (shown when patient taps "Yes") ─────────────
    allergy_detail: {
      hindi:
        '📝 Kripya *allergy ka naam* batayein:\n\n' +
        '_Jaise: Penicillin, Aspirin, Badam_',
      english:
        '📝 Please *name your allergy*:\n\n' +
        '_Example: Penicillin, Aspirin, Nuts_',
      hinglish:
        '📝 *Allergy ka naam* batayein:\n\n' +
        '_Jaise: Penicillin, Aspirin, Nuts_',
    },

    // ── Step 6: Current medicines ─────────────────────────────────────────────
    ask_medicines: {
      hindi:
        '🩺 Kya aap abhi koi *regular dawa* le rahe hain?\n\n' +
        '_Jaise: BP, Sugar, Thyroid, Vitamin_',
      english:
        '🩺 Are you currently taking any *regular medicines*?\n\n' +
        '_Example: BP tablets, Diabetes, Thyroid, Vitamins_',
      hinglish:
        '🩺 Abhi koi *regular medicine* le rahe hain?\n\n' +
        '_Jaise: BP, Sugar, Thyroid, Vitamin_',
    },

    // ── Step 6b: Medicine details (shown when patient taps "Yes") ────────────
    medicine_detail: {
      hindi:
        '📝 Kripya *dawaaon ke naam* batayein:\n\n' +
        '_Jaise: Metformin 500mg, Amlodipine, Vitamin D_',
      english:
        '📝 Please *name the medicines* you take:\n\n' +
        '_Example: Metformin 500mg, Amlodipine, Vitamin D_',
      hinglish:
        '📝 *Medicines ke naam* batayein:\n\n' +
        '_Jaise: Metformin 500mg, Amlodipine, Vitamin D_',
    },

    // ── Step 7: Symptoms ──────────────────────────────────────────────────────
    ask_symptoms: {
      hindi:
        '🗣️ Ab *apni takleef detail mein* batayein।\n\n' +
        'Text likhein ya *voice note* bhejein — dono chalega।\n\n' +
        '_Jaise: "3 din se bukhar hai, sar mein dard hai aur bhook nahi lagti"_',
      english:
        '🗣️ Please *describe your symptoms* in detail.\n\n' +
        'Type a message or send a *voice note* — either works.\n\n' +
        '_Example: "Fever for 3 days, headache and loss of appetite"_',
      hinglish:
        '🗣️ Ab apni *problem detail mein* batayein।\n\n' +
        'Text likhein ya *voice note* bhejein।\n\n' +
        '_Jaise: "3 din se bukhar, sar dard aur weakness"_',
    },

    // ── Processing ────────────────────────────────────────────────────────────
    processing: {
      hindi:
        '⏳ *Aapki details check ho rahi hain...*\n\n' +
        'Ek moment — AI doctor ke liye summary prepare kar raha hai। 🤖',
      english:
        '⏳ *Analysing your information...*\n\n' +
        'One moment — AI is preparing your case summary for the doctor. 🤖',
      hinglish:
        '⏳ *Details process ho rahi hain...*\n\n' +
        'Ek second — AI summary bana raha hai doctor ke liye। 🤖',
    },

    // ── Payment intro ─────────────────────────────────────────────────────────
    payment_intro: {
      hindi:
        '✅ *Aapki jaankari poori ho gayi!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '👨‍⚕️ *Consultation Fee: ₹{fee}*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🔐 *100% Secure Payment*\n' +
        '• Doctor payment ke baad aapka case review karenge\n' +
        '• Prescription WhatsApp pe milegi\n' +
        '• Powered by Cashfree — bank-grade security\n\n' +
        'Neeche button dabayein aur payment karein 👇',
      english:
        '✅ *Your information is complete!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '👨‍⚕️ *Consultation Fee: ₹{fee}*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🔐 *100% Secure Payment*\n' +
        '• Doctor reviews your case after payment\n' +
        '• Prescription delivered on WhatsApp\n' +
        '• Powered by Cashfree — bank-grade security\n\n' +
        'Tap the button below to pay 👇',
      hinglish:
        '✅ *Aapki details complete ho gayi!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '👨‍⚕️ *Consultation Fee: ₹{fee}*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🔐 *100% Secure Payment*\n' +
        '• Payment ke baad doctor aapka case dekhenge\n' +
        '• Prescription WhatsApp pe aayegi\n' +
        '• Powered by Cashfree — bank-grade security\n\n' +
        'Neeche button press karein 👇',
    },

    // ── Payment done (confirmation) ───────────────────────────────────────────
    payment_done: {
      hindi:
        '🎉 *Payment Successful!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '✅ Fee received\n' +
        '👨‍⚕️ Doctor reviewing your case\n' +
        '💊 Prescription coming on WhatsApp\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '_Thoda wait karein — prescription jald milegi।_',
      english:
        '🎉 *Payment Successful!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '✅ Fee received\n' +
        '👨‍⚕️ Doctor reviewing your case\n' +
        '💊 Prescription coming on WhatsApp\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '_Please wait — your prescription will arrive shortly._',
      hinglish:
        '🎉 *Payment Ho Gayi!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '✅ Fee receive ho gayi\n' +
        '👨‍⚕️ Doctor aapka case dekh rahe hain\n' +
        '💊 Prescription WhatsApp pe aayegi\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '_Thoda wait karein — jaldi milegi।_',
    },

    // ── Awaiting payment (patient pings during payment) ───────────────────────
    awaiting_payment: {
      hindi:
        '🔄 *Payment pending hai...*\n\n' +
        'Confirm hone par turant message aayega। Kripya wait karein।',
      english:
        '🔄 *Waiting for payment confirmation...*\n\n' +
        'You will receive a message as soon as it is confirmed.',
      hinglish:
        '🔄 *Payment pending hai...*\n\n' +
        'Confirm hone pe message aayega। Wait karein।',
    },

    // ── Emergency ─────────────────────────────────────────────────────────────
    emergency: {
      hindi:
        '🚨 *EMERGENCY — Turant Madad Lein!*\n\n' +
        'Aapke symptoms *bahut serious* hain।\n\n' +
        '📞 *Ambulance: 108*\n' +
        '📞 *Emergency: 112*\n\n' +
        '🏥 Abhi *najdeeki hospital* jayen।\n' +
        '_Online consultation mein der ho sakti hai।_',
      english:
        '🚨 *EMERGENCY — Seek Help Immediately!*\n\n' +
        'Your symptoms appear *very serious*.\n\n' +
        '📞 *Ambulance: 108*\n' +
        '📞 *Emergency: 112*\n\n' +
        '🏥 Go to the *nearest hospital now*.\n' +
        '_Do not wait for an online consultation._',
      hinglish:
        '🚨 *EMERGENCY — Turant Help Lein!*\n\n' +
        'Symptoms *bahut serious* lag rahe hain।\n\n' +
        '📞 *Ambulance: 108*\n' +
        '📞 *Emergency: 112*\n\n' +
        '🏥 *Najdeeki hospital* jayen abhi।\n' +
        '_Online consultation mein time lagta hai।_',
    },

    // ── Prescription ready ────────────────────────────────────────────────────
    prescription_ready: {
      hindi:
        '💊 *Aapki Prescription Taiyaar Hai!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '👨‍⚕️ Doctor ne aapka case review kar liya hai\n' +
        '📄 Neeche link se prescription download karein\n' +
        '━━━━━━━━━━━━━━━━━━━━',
      english:
        '💊 *Your Prescription is Ready!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '👨‍⚕️ The doctor has reviewed your case\n' +
        '📄 Download your prescription using the link below\n' +
        '━━━━━━━━━━━━━━━━━━━━',
      hinglish:
        '💊 *Prescription Taiyaar Hai!*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '👨‍⚕️ Doctor ne case review kar liya\n' +
        '📄 Neeche link se download karein\n' +
        '━━━━━━━━━━━━━━━━━━━━',
    },

    // ── Error / fallback prompts ──────────────────────────────────────────────
    name_not_understood: {
      hindi:
        '⚠️ Naam samajh nahi aaya।\n\n' +
        'Kripya sirf apna *poora naam* likhein:\n' +
        '_Jaise: Rahul Sharma_',
      english:
        '⚠️ I could not catch your name.\n\n' +
        'Please type your *full name*:\n' +
        '_Example: Rahul Sharma_',
      hinglish:
        '⚠️ Naam nahi samjha।\n\n' +
        'Apna *poora naam* likhein:\n' +
        '_Jaise: Rahul Sharma_',
    },
  };

  return prompts[key]?.[lang] ?? prompts[key]?.hinglish ?? prompts[key]?.english ?? key;
}
