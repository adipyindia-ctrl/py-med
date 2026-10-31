export const APP_NAME = 'MediVoice AI';
export const CONSULTATION_FEE = Number(process.env.CONSULTATION_FEE) || 300;
export const CURRENCY = 'INR';

export const EMERGENCY_SYMPTOMS = [
  'chest pain',
  'difficulty breathing',
  'breathlessness',
  'stroke',
  'unconscious',
  'seizure',
  'severe bleeding',
  'heart attack',
  'paralysis',
  'severe head injury',
  'loss of consciousness',
  'high fever above 104',
  'anaphylaxis',
  'allergic reaction severe',
  'choking',
  'poisoning',
  'overdose',
  'suicidal',
  'severe abdominal pain',
];

export const CONVERSATION_PROMPTS = {
  WELCOME: `🏥 *Namaste! MediVoice AI mein aapka swagat hai.*\n\nMain aapki medical consultation mein help karunga.\n\nPehle, please apna *poora naam* batayein:`,
  ASK_AGE: `Shukriya! Ab apni *umar (age)* batayein:`,
  ASK_GENDER: `Theek hai! Apna *gender* select karein:\n\n1️⃣ Male\n2️⃣ Female\n3️⃣ Other`,
  ASK_SYMPTOMS_DURATION: `Aapke symptoms *kitne din / ghante* se hain?`,
  ASK_ALLERGIES: `Kya aapko kisi *medicine ya food se allergy* hai?\n\n(Agar nahi, to "No" likhein)`,
  ASK_MEDICINES: `Kya aap abhi koi *regular medicines* le rahe hain?\n\n(Agar nahi, to "No" likhein)`,
  SAFETY_CHECK: `Aapki information process ho rahi hai...`,
  PAYMENT_PROMPT: (fee: number) =>
    `✅ Aapki details record ho gayi!\n\n*Consultation Fee: ₹${fee}*\n\nSecure payment ke liye neeche diye link par click karein:\n\n`,
  PAYMENT_SUCCESS: `✅ *Payment successful!*\n\nAapki consultation queue mein add ho gayi hai. Doctor jald hi aapki prescription bhejenge.\n\n_Aamaatour par 30-60 minutes mein response milta hai._`,
  PRESCRIPTION_READY: (url: string) =>
    `📋 *Aapki prescription taiyaar hai!*\n\n${url}\n\n_Koi bhi sawaal ho to reply karein._`,
  EMERGENCY_ALERT: `🚨 *EMERGENCY ALERT*\n\nAapke symptoms serious lag rahe hain. Kripya *TURANT* in steps lein:\n\n1. 📞 Emergency helpline: *112*\n2. 🏥 Nearest hospital jayen\n3. Ya *108* ambulance ke liye call karein\n\nHam aapke doctor ko bhi alert kar rahe hain.`,
};

export const WHATSAPP_API_VERSION = 'v18.0';
export const CASHFREE_API_VERSION = '2026-01-01';

export const ROUTES = {
  DASHBOARD: '/dashboard',
  CONSULTATIONS: '/dashboard/consultations',
  PATIENTS: '/dashboard/patients',
  PRESCRIPTIONS: '/dashboard/prescriptions',
  ANALYTICS: '/dashboard/analytics',
  AUTH_LOGIN: '/auth/login',
};
