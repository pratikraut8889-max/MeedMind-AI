/**
 * Workflow 3: Symptom Analysis (Text & Visual Dermatological)
 * Evaluates symptoms, urgency (GREEN/YELLOW/RED), causes, and safe triage advice.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { SymptomAnalysisPrompt, ImageAnalysisPrompt } from '../prompts/promptRegistry';
import { visualSymptomSchema } from '../schemas/aiSchemas';
import { STANDARD_MEDICAL_DISCLAIMER } from '../safety/medicalTriage';

export interface SymptomAnalysisInput {
  description?: string;
  base64Image?: string;
  mimeType?: string;
  duration?: string;
  severity?: string;
  language?: string;
}

export interface SymptomAnalysisOutput {
  urgency: 'GREEN' | 'YELLOW' | 'RED';
  conditionName: string;
  possibleCauses: string[];
  recommendation: string;
  childExplanation: string;
  questionsForDoctor: string[];
  disclaimer: string;
}

export async function runSymptomAnalysisWorkflow(
  input: SymptomAnalysisInput
): Promise<PipelineResult<SymptomAnalysisOutput>> {
  const language = input.language || 'English';
  const isVisual = !!input.base64Image;

  if (isVisual) {
    return executeAiPipeline<any, SymptomAnalysisOutput>({
      featureName: 'Visual Symptom Analysis (Dermatology)',
      template: ImageAnalysisPrompt,
      rawUserInput: input.description || 'Visual symptom image',
      ragQuery: `${input.description || ''} rash wound skin lesion infection dermatitis`,
      ragDocLimit: 3,
      responseSchema: visualSymptomSchema,
      inlineFiles: [
        {
          mimeType: input.mimeType || 'image/jpeg',
          data: input.base64Image!
        }
      ],
      userParams: {
        analysisType: 'symptom_skin',
        targetLanguage: language
      },
      fallbackGenerator: (safety) => ({
        urgency: safety.emergencyActionRequired ? 'RED' : 'YELLOW',
        conditionName: 'Unspecified Skin or Physical Symptom',
        possibleCauses: [
          'Mild localized dermatological reaction',
          'Contact irritation or mild allergic dermatitis',
          'Minor physical abrasion or insect bite'
        ],
        recommendation:
          'Keep the area clean, cool, and dry. Do not scratch. If you develop spreading redness, warmth, fever, or pus, visit an urgent care clinic.',
        childExplanation:
          'Your skin has a tiny owie! Our body is sending helpers to make it feel better soon.',
        questionsForDoctor: [
          'Does this skin presentation appear infectious or allergic?',
          'Is a topical antihistamine or hydrocortisone ointment recommended?'
        ],
        disclaimer: STANDARD_MEDICAL_DISCLAIMER
      })
    });
  }

  // Text-based symptom analysis
  return executeAiPipeline<any, SymptomAnalysisOutput>({
    featureName: 'Clinical Symptom Analysis',
    template: SymptomAnalysisPrompt,
    rawUserInput: input.description || '',
    ragQuery: input.description || 'clinical symptoms',
    ragDocLimit: 3,
    responseSchema: visualSymptomSchema,
    userParams: {
      symptomDescription: input.description || '',
      duration: input.duration,
      severity: input.severity,
      targetLanguage: language
    },
    fallbackGenerator: (safety) => ({
      urgency: safety.emergencyActionRequired ? 'RED' : 'YELLOW',
      conditionName: 'Reported Symptom Cluster',
      possibleCauses: [
        'Symptom evaluation requires clinical context',
        'Physical examination by a physician recommended'
      ],
      recommendation:
        'Monitor temperature, rest, and maintain fluid intake. If symptoms worsen, consult a doctor.',
      childExplanation:
        'Your body is taking a little rest to recharge its energy!',
      questionsForDoctor: [
        'What are the typical triggers for these symptoms?',
        'What warning signs should prompt me to go to urgent care?'
      ],
      disclaimer: STANDARD_MEDICAL_DISCLAIMER
    })
  });
}
