import { EMERGENCY_SYMPTOMS } from '@/lib/constants';
import type { SafetyScreenResult, UrgencyLevel } from '@/types';
import OpenAI from 'openai';

/** Create an OpenAI client at call time so Settings UI key changes take effect without restart */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  return new OpenAI({ apiKey });
}

export async function runSafetyScreening(
  symptoms: string[],
  transcript?: string,
): Promise<SafetyScreenResult> {
  const symptomsText = symptoms.join(', ').toLowerCase();
  const fullText = `${symptomsText} ${(transcript ?? '').toLowerCase()}`;

  // Fast keyword check first
  const emergencyMatches = EMERGENCY_SYMPTOMS.filter((s) => fullText.includes(s));

  if (emergencyMatches.length > 0) {
    return {
      urgencyLevel: 'EMERGENCY',
      isEmergency: true,
      emergencySymptoms: emergencyMatches,
      recommendation:
        'IMMEDIATE: Patient reports emergency symptoms. Contact emergency services (112) immediately.',
    };
  }

  // AI-based screening for nuanced cases
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a medical triage AI. Assess urgency of patient symptoms.
Return JSON only:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
  "isEmergency": boolean,
  "emergencySymptoms": [],
  "recommendation": "string"
}

LOW = routine, can wait
MEDIUM = should be seen within 24h  
HIGH = should be seen within 2-4h
EMERGENCY = immediate emergency care needed`,
        },
        {
          role: 'user',
          content: `Symptoms: ${symptomsText}${transcript ? `\nTranscript: ${transcript}` : ''}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content ?? '{}';
    const result = JSON.parse(content) as SafetyScreenResult;
    return result;
  } catch {
    // Fallback to rule-based
    const urgency: UrgencyLevel = determineUrgencyRuleBased(symptomsText);
    return {
      urgencyLevel: urgency,
      isEmergency: false,
      emergencySymptoms: [],
      recommendation: 'Routine consultation — proceed with standard care.',
    };
  }
}

function determineUrgencyRuleBased(symptomsText: string): UrgencyLevel {
  const HIGH_KEYWORDS = ['high fever', 'vomiting blood', 'severe pain', 'dehydration', 'dizziness'];
  const MEDIUM_KEYWORDS = ['fever', 'vomiting', 'diarrhea', 'cough', 'body pain', 'headache'];

  if (HIGH_KEYWORDS.some((k) => symptomsText.includes(k))) return 'HIGH';
  if (MEDIUM_KEYWORDS.some((k) => symptomsText.includes(k))) return 'MEDIUM';
  return 'LOW';
}
