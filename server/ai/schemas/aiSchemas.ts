import { Type, Schema } from '@google/genai';

/**
 * Structured Medical Report Analysis Schema.
 * Guarantees lab measurements, status tags, red flags, questions, and child analogies.
 */
export const medicalReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: '2 to 3-sentence empathetic, plain-language patient summary.' },
    simpleExplanation: { type: Type.STRING, description: 'Comprehensive breakdown explaining the medical findings in accessible terms without jargon.' },
    childExplanation: { type: Type.STRING, description: 'Playful, reassuring analogy-based explanation suitable for children or anxious patients (Teddy Bear Mode).' },
    estimatedCost: { type: Type.STRING, description: 'Approximate estimated financial cost range for recommended follow-ups in the target location/currency.' },
    urgency: {
      type: Type.STRING,
      enum: ['information', 'routine', 'urgent', 'emergency'],
      description: 'Overall clinical triage priority level.'
    },
    redFlags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          finding: { type: Type.STRING, description: 'The specific abnormal finding or risk.' },
          severity: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
          action: { type: Type.STRING, description: 'Clear patient action advice.' }
        },
        required: ['finding', 'severity', 'action']
      }
    },
    labMeasurements: {
      type: Type.ARRAY,
      description: 'Structured laboratory test values extracted directly from the document.',
      items: {
        type: Type.OBJECT,
        properties: {
          test: { type: Type.STRING, description: 'Name of the laboratory test (e.g., Hemoglobin, Glucose, Platelets).' },
          value: { type: Type.STRING, description: 'Patient numerical or categorical result.' },
          unit: { type: Type.STRING, description: 'Standard unit of measurement (e.g., g/dL, mg/dL, /uL).' },
          referenceRangeMin: { type: Type.NUMBER, description: 'Lower normal boundary if provided in report or standard medical consensus.' },
          referenceRangeMax: { type: Type.NUMBER, description: 'Upper normal boundary if provided in report or standard medical consensus.' },
          referenceRangeText: { type: Type.STRING, description: 'Textual reference range from report (e.g., 12.0 - 16.0).' },
          status: {
            type: Type.STRING,
            enum: ['normal', 'attention', 'critical'],
            description: 'Clinical observation status.'
          },
          notes: { type: Type.STRING, description: 'Brief plain-language interpretation of what this specific test measures.' }
        },
        required: ['test', 'value', 'unit', 'status']
      }
    },
    medicationInteractions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          medication: { type: Type.STRING },
          interaction: { type: Type.STRING }
        },
        required: ['medication', 'interaction']
      }
    },
    nextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Actionable, numbered next steps for the patient.'
    },
    questionsForDoctor: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Recommended high-value questions for the patient to ask their physician.'
    },
    language: { type: Type.STRING, description: 'Language of the output.' }
  },
  required: ['summary', 'simpleExplanation', 'childExplanation', 'estimatedCost', 'redFlags', 'nextSteps', 'language']
};

/**
 * AI Health Assistant Chat Schema (RAG Grounded).
 */
export const chatResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    urgency: {
      type: Type.STRING,
      enum: ['information', 'routine', 'urgent', 'emergency']
    },
    summary: { type: Type.STRING, description: 'Direct, conversational, empathetic plain-language answer.' },
    possibleExplanations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Possible causes or medical context, clearly stated as possibilities not definitive diagnoses.'
    },
    redFlags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Critical warning signs that would require urgent or immediate medical evaluation.'
    },
    recommendedNextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Practical, safe next steps (e.g., hydration, symptom logging, scheduling appointment).'
    },
    questionsForDoctor: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific questions to help the patient converse with their doctor.'
    },
    emergencyActionRequired: {
      type: Type.BOOLEAN,
      description: 'True if immediate 911/112 emergency care is indicated.'
    },
    disclaimer: { type: Type.STRING, description: 'Medical disclaimer statement.' }
  },
  required: ['urgency', 'summary', 'possibleExplanations', 'recommendedNextSteps', 'questionsForDoctor', 'disclaimer']
};

/**
 * Visual Symptom Analysis Schema.
 */
export const visualSymptomSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    urgency: { type: Type.STRING, enum: ['GREEN', 'YELLOW', 'RED'] },
    conditionName: { type: Type.STRING, description: 'Descriptive clinical term or symptom name.' },
    possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendation: { type: Type.STRING, description: 'Practical, immediate home care or triage advice.' },
    childExplanation: { type: Type.STRING, description: 'Compassionate, simple explanation for young patients.' },
    questionsForDoctor: { type: Type.ARRAY, items: { type: Type.STRING } },
    disclaimer: { type: Type.STRING }
  },
  required: ['urgency', 'conditionName', 'possibleCauses', 'recommendation', 'childExplanation', 'disclaimer']
};

/**
 * Doctor Letter Summary Schema.
 */
export const doctorLetterSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    patientName: { type: Type.STRING },
    date: { type: Type.STRING },
    summary: { type: Type.STRING, description: 'Objective clinical summary for healthcare provider.' },
    findings: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Bullet points of patient reports/labs.' },
    criticalNotes: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Reported symptoms or red flags.' },
    questionsForDoctor: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Prepared patient inquiries.' },
    disclaimer: { type: Type.STRING }
  },
  required: ['patientName', 'date', 'summary', 'findings', 'questionsForDoctor']
};

/**
 * Medication Packaging Analysis Schema.
 */
export const medicationAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Brand or generic medication name.' },
    dosage: { type: Type.STRING, description: 'Strength (e.g., 500mg, 10mL).' },
    frequency: { type: Type.STRING, description: 'Dosing schedule.' },
    instructions: { type: Type.STRING, description: 'Important administration instructions.' },
    possibleSideEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
    precautions: { type: Type.ARRAY, items: { type: Type.STRING } },
    whenToContactDoctor: { type: Type.STRING }
  },
  required: ['name', 'dosage', 'frequency', 'instructions']
};
