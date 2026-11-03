import fs from 'fs';
import path from 'path';

export interface AppSettings {
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappVerifyToken: string;
  whatsappTestRecipient: string;
  openaiApiKey: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeEnv: string;
  consultationFee: number;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'settings.json');
const ENV_FILE_PATH = path.join(process.cwd(), '.env');

/**
 * Returns merged settings: defaults from process.env, overridden by settings.json if present
 */
export function getAppSettings(): AppSettings {
  let fileSettings: Partial<AppSettings> = {};

  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      fileSettings = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Settings] Error reading settings.json:', err);
  }

  return {
    // Prioritize environment variables for secret tokens (they are refreshed via Vercel dashboard)
    whatsappAccessToken:
      // Remove surrounding quotes if any
      (process.env.WHATSAPP_ACCESS_TOKEN?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.whatsappAccessToken?.replace(/^"|"$/g, '').trim()) ||
      '',
    whatsappPhoneNumberId:
      (process.env.WHATSAPP_PHONE_NUMBER_ID?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.whatsappPhoneNumberId?.replace(/^"|"$/g, '').trim()) ||
      '',
    whatsappBusinessAccountId:
      (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.whatsappBusinessAccountId?.replace(/^"|"$/g, '').trim()) ||
      '',
    whatsappVerifyToken:
      (process.env.WHATSAPP_VERIFY_TOKEN?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.whatsappVerifyToken?.replace(/^"|"$/g, '').trim()) ||
      'PYINDIA',
    whatsappTestRecipient:
      (process.env.WHATSAPP_TEST_RECIPIENT?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.whatsappTestRecipient?.replace(/^"|"$/g, '').trim()) ||
      '',
    openaiApiKey:
      (process.env.OPENAI_API_KEY?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.openaiApiKey?.replace(/^"|"$/g, '').trim()) ||
      '',
    cashfreeAppId:
      (process.env.CASHFREE_APP_ID?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.cashfreeAppId?.replace(/^"|"$/g, '').trim()) ||
      '',
    cashfreeSecretKey:
      (process.env.CASHFREE_SECRET_KEY?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.cashfreeSecretKey?.replace(/^"|"$/g, '').trim()) ||
      '',
    cashfreeEnv:
      (process.env.CASHFREE_ENV?.replace(/^"|"$/g, '').trim()) ||
      (fileSettings.cashfreeEnv?.replace(/^"|"$/g, '').trim()) ||
      'sandbox',
    consultationFee:
      Number(
        process.env.CONSULTATION_FEE?.replace(/^"|"$/g, '').trim() ||
          fileSettings.consultationFee?.toString() ||
          '300'
      ),
  };
}

/**
 * Saves settings to settings.json, updates process.env, and updates .env file if it exists
 */
export function saveAppSettings(newSettings: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const merged: AppSettings = {
    ...current,
    ...newSettings,
    consultationFee: Number(newSettings.consultationFee ?? current.consultationFee ?? 300),
  };

  // 1. Write to settings.json
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Settings] Error writing settings.json:', err);
  }

  // 2. Update process.env in memory immediately
  if (merged.whatsappAccessToken) process.env.WHATSAPP_ACCESS_TOKEN = merged.whatsappAccessToken;
  if (merged.whatsappPhoneNumberId) process.env.WHATSAPP_PHONE_NUMBER_ID = merged.whatsappPhoneNumberId;
  if (merged.whatsappBusinessAccountId) process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = merged.whatsappBusinessAccountId;
  if (merged.whatsappVerifyToken) process.env.WHATSAPP_VERIFY_TOKEN = merged.whatsappVerifyToken;
  if (merged.whatsappTestRecipient) process.env.WHATSAPP_TEST_RECIPIENT = merged.whatsappTestRecipient;
  if (merged.openaiApiKey) process.env.OPENAI_API_KEY = merged.openaiApiKey;
  if (merged.cashfreeAppId) process.env.CASHFREE_APP_ID = merged.cashfreeAppId;
  if (merged.cashfreeSecretKey) process.env.CASHFREE_SECRET_KEY = merged.cashfreeSecretKey;
  if (merged.cashfreeEnv) process.env.CASHFREE_ENV = merged.cashfreeEnv;
  if (merged.consultationFee) process.env.CONSULTATION_FEE = String(merged.consultationFee);

  // 3. Sync to .env file if possible
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      let envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');

      const updateKey = (key: string, val: string | number) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const formatted = `${key}="${val}"`;
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, formatted);
        } else {
          envContent += `\n${formatted}`;
        }
      };

      if (merged.whatsappAccessToken) updateKey('WHATSAPP_ACCESS_TOKEN', merged.whatsappAccessToken);
      if (merged.whatsappPhoneNumberId) updateKey('WHATSAPP_PHONE_NUMBER_ID', merged.whatsappPhoneNumberId);
      if (merged.whatsappBusinessAccountId) updateKey('WHATSAPP_BUSINESS_ACCOUNT_ID', merged.whatsappBusinessAccountId);
      if (merged.whatsappVerifyToken) updateKey('WHATSAPP_VERIFY_TOKEN', merged.whatsappVerifyToken);
      if (merged.whatsappTestRecipient) updateKey('WHATSAPP_TEST_RECIPIENT', merged.whatsappTestRecipient);
      if (merged.openaiApiKey) updateKey('OPENAI_API_KEY', merged.openaiApiKey);
      if (merged.cashfreeAppId) updateKey('CASHFREE_APP_ID', merged.cashfreeAppId);
      if (merged.cashfreeSecretKey) updateKey('CASHFREE_SECRET_KEY', merged.cashfreeSecretKey);
      if (merged.cashfreeEnv) updateKey('CASHFREE_ENV', merged.cashfreeEnv);
      if (merged.consultationFee) updateKey('CONSULTATION_FEE', merged.consultationFee);

      fs.writeFileSync(ENV_FILE_PATH, envContent, 'utf-8');
    }
  } catch (err) {
    console.error('[Settings] Error updating .env:', err);
  }

  return merged;
}
