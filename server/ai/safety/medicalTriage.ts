export type UrgencyLevel = 'information' | 'routine' | 'urgent' | 'emergency';

export interface TriageCheckResult {
  urgency: UrgencyLevel;
  emergencyActionRequired: boolean;
  detectedEmergencyFlags: string[];
  immediateInstructions?: string;
  disclaimer: string;
}

const EMERGENCY_PATTERNS = [
  {
    regex: /\b(chest pain|crushing pressure|pain radiating to (arm|jaw|back)|heart attack|myocardial infarction)\b/i,
    flag: 'Possible Acute Coronary Syndrome / Heart Attack symptoms detected',
    instruction: 'If you are experiencing severe chest pain, pressure, or radiating arm pain, call 911 (or your local emergency number: 112, 999) immediately. Do not attempt to drive yourself.'
  },
  {
    regex: /\b(stroke|facial droop|slurred speech|sudden weakness on one side|can'?t speak|arm drift)\b/i,
    flag: 'Signs consistent with Acute Stroke (B.E. F.A.S.T.) detected',
    instruction: 'Stroke requires immediate emergency medical care within minutes. Call emergency services (911/112) right away.'
  },
  {
    regex: /\b(can'?t breathe|severe shortness of breath|suffocating|gasping for air|blue lips|choking|anaphylaxis|throat swelling|severe allergic reaction)\b/i,
    flag: 'Severe Respiratory Distress / Anaphylaxis signs detected',
    instruction: 'Severe breathing difficulty or airway obstruction is a life-threatening emergency. Call 911 or administer an epinephrine auto-injector (EpiPen) if prescribed and seek immediate ER care.'
  },
  {
    regex: /\b(suicid|kill myself|want to die|end my life|self-harm|overdose)\b/i,
    flag: 'Acute crisis / self-harm emergency detected',
    instruction: 'If you or someone you know is in distress or having thoughts of self-harm, please reach out immediately: Call or text 988 (Suicide & Crisis Lifeline in the US & Canada), call 911, or contact your local emergency crisis team. Free, confidential support is available 24/7.'
  },
  {
    regex: /\b(unconscious|passed out|unresponsive|seizure lasting|severe blood loss|spurting blood|coughing up blood)\b/i,
    flag: 'Loss of consciousness / severe hemorrhage detected',
    instruction: 'Call emergency medical services immediately. Keep the person safe and apply firm pressure to active bleeding if possible.'
  }
];

const URGENT_PATTERNS = [
  {
    regex: /\b(fever (over|above|>|higher than) 103|temperature 39\.[4-9]|fever with stiff neck|blood in stool|black tarry stool|severe abdominal pain|acute appendicitis)\b/i,
    flag: 'High fever or severe acute abdominal symptoms detected'
  },
  {
    regex: /\b(deep cut|wound that won'?t stop bleeding|possible fracture|bone visible|severe burn)\b/i,
    flag: 'Acute physical trauma requiring urgent clinical evaluation'
  }
];

export const STANDARD_MEDICAL_DISCLAIMER =
  'MediMind AI provides educational health information and is NOT a medical diagnosis, clinical opinion, or substitute for professional healthcare. Always consult a licensed physician for medical advice, diagnosis, or treatment decisions. In an emergency, contact emergency medical services immediately.';

/**
 * Deterministic Clinical Safety & Triage Evaluator.
 * Guarantees that critical red flags immediately elevate the response urgency,
 * independent of LLM temperature or output randomness.
 */
export function evaluateClinicalSafety(text: string): TriageCheckResult {
  const flags: string[] = [];
  let immediateInstruction: string | undefined;
  let isEmergency = false;
  let isUrgent = false;

  for (const item of EMERGENCY_PATTERNS) {
    if (item.regex.test(text)) {
      flags.push(item.flag);
      isEmergency = true;
      if (!immediateInstruction) {
        immediateInstruction = item.instruction;
      }
    }
  }

  if (!isEmergency) {
    for (const item of URGENT_PATTERNS) {
      if (item.regex.test(text)) {
        flags.push(item.flag);
        isUrgent = true;
      }
    }
  }

  const urgency: UrgencyLevel = isEmergency
    ? 'emergency'
    : isUrgent
    ? 'urgent'
    : 'routine';

  return {
    urgency,
    emergencyActionRequired: isEmergency,
    detectedEmergencyFlags: flags,
    immediateInstructions: immediateInstruction,
    disclaimer: STANDARD_MEDICAL_DISCLAIMER
  };
}
