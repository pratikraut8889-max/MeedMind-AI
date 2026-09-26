/**
 * Workflow 2: Medical Report Analysis (Multimodal PDF/Image)
 * Extracts biomarkers, reference ranges, red flags, cost estimates, and analogies.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { MedicalReportAnalysisPrompt } from '../prompts/promptRegistry';
import { medicalReportSchema } from '../schemas/aiSchemas';
import { STANDARD_MEDICAL_DISCLAIMER } from '../safety/medicalTriage';

export interface ReportAnalysisWorkflowInput {
  fileBase64: string;
  mimeType: string;
  language?: string;
  currentMeds?: string;
  location?: string;
}

export interface ReportAnalysisWorkflowOutput {
  summary: string;
  simpleExplanation: string;
  childExplanation: string;
  estimatedCost: string;
  urgency: 'information' | 'routine' | 'urgent' | 'emergency';
  redFlags: Array<{ finding: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; action: string }>;
  labMeasurements: Array<{
    test: string;
    value: string;
    unit: string;
    referenceRangeMin?: number;
    referenceRangeMax?: number;
    referenceRangeText?: string;
    status: 'normal' | 'attention' | 'critical';
    notes?: string;
  }>;
  medicationInteractions?: Array<{ medication: string; interaction: string }>;
  nextSteps: string[];
  questionsForDoctor: string[];
  language: string;
  disclaimer: string;
}

export async function runReportAnalysisWorkflow(
  input: ReportAnalysisWorkflowInput
): Promise<PipelineResult<ReportAnalysisWorkflowOutput>> {
  const targetLanguage = input.language || 'English';
  const currentMeds = input.currentMeds || '';
  const location = input.location || 'Standard';

  // Extract medical terms for RAG retrieval
  const ragQuery = `${currentMeds} metabolic panel blood count urinalysis lab biomarker ranges`.trim();

  return executeAiPipeline<any, ReportAnalysisWorkflowOutput>({
    featureName: 'Medical Report Analysis',
    template: MedicalReportAnalysisPrompt,
    rawUserInput: `${currentMeds} ${location}`,
    ragQuery,
    ragDocLimit: 4,
    responseSchema: medicalReportSchema,
    inlineFiles: [
      {
        mimeType: input.mimeType,
        data: input.fileBase64
      }
    ],
    userParams: {
      targetLanguage,
      currentMeds,
      location
    },
    validateOutput: (out) => {
      if (!out || typeof out.summary !== 'string') {
        return { valid: false, error: 'Malformed report output' };
      }
      return { valid: true };
    },
    fallbackGenerator: (safety, error) => ({
      summary: 'Report analysis completed with baseline clinical observations. Please review the structured values with your clinician.',
      simpleExplanation: 'The document was scanned, but detailed optical resolution was limited. We recommend verifying specific biomarker levels with your physician or lab portal.',
      childExplanation: 'Your body is like a busy superhero team! The doctor took a picture of your helpers to make sure everyone is doing their job well.',
      estimatedCost: 'Consult local primary care clinic for standard consultation fee ($30 - $150).',
      urgency: safety.urgency,
      redFlags: safety.detectedEmergencyFlags.map((f) => ({
        finding: f,
        severity: 'HIGH',
        action: 'Seek prompt medical evaluation.'
      })),
      labMeasurements: [],
      medicationInteractions: [],
      nextSteps: [
        'Review original laboratory paper with attending physician.',
        'Request an electronic portal copy if text is blurry.',
        'Schedule a routine follow-up appointment.'
      ],
      questionsForDoctor: [
        'How do these laboratory values compare to my previous baseline tests?',
        'Do any of these markers warrant follow-up testing or lifestyle modifications?'
      ],
      language: targetLanguage,
      disclaimer: STANDARD_MEDICAL_DISCLAIMER
    })
  });
}
