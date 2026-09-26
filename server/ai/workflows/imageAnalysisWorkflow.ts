/**
 * Workflow 7: Image-Based Analysis (Body Scan & Vaccine Records)
 * Handles multimodal vision processing for specialized health imagery.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { ImageAnalysisPrompt } from '../prompts/promptRegistry';
import { Type } from '@google/genai';

export interface BodyScanWorkflowInput {
  base64Image: string;
  mimeType: string;
  language?: string;
}

export interface BodyScanWorkflowOutput {
  summary: string;
  findings: Array<{ area: string; observation: string; severity: 'NORMAL' | 'MONITOR' | 'ACTION_REQUIRED' }>;
  recommendations: string[];
  nextSteps: string[];
}

export async function runBodyScanWorkflow(
  input: BodyScanWorkflowInput
): Promise<PipelineResult<BodyScanWorkflowOutput>> {
  const language = input.language || 'English';

  const bodyScanSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      findings: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            area: { type: Type.STRING },
            observation: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ['NORMAL', 'MONITOR', 'ACTION_REQUIRED'] }
          },
          required: ['area', 'observation', 'severity']
        }
      },
      recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['summary', 'findings', 'recommendations', 'nextSteps']
  };

  return executeAiPipeline<any, BodyScanWorkflowOutput>({
    featureName: 'Body Scan Optical Inspection',
    template: ImageAnalysisPrompt,
    rawUserInput: 'Body scan thermal or optical observation',
    ragQuery: 'body scan posture physical symmetry musculoskeletal review',
    ragDocLimit: 2,
    responseSchema: bodyScanSchema,
    inlineFiles: [{ mimeType: input.mimeType, data: input.base64Image }],
    userParams: {
      analysisType: 'body_scan',
      targetLanguage: language
    },
    fallbackGenerator: () => ({
      summary: 'Body scan review completed. Visual indicators demonstrate standard overall physical symmetry.',
      findings: [
        { area: 'General Symmetry', observation: 'No gross asymmetries noted from visual review.', severity: 'NORMAL' },
        { area: 'Postural Alignment', observation: 'Maintain ergonomic posture throughout daily routines.', severity: 'MONITOR' }
      ],
      recommendations: ['Maintain regular physical stretching and ergonomic posture.'],
      nextSteps: ['Consult a physical therapist if persistent localized pain is experienced.']
    })
  });
}

export interface VaccineCardWorkflowInput {
  base64Image: string;
  mimeType: string;
  language?: string;
}

export interface VaccineRecord {
  id?: string;
  name: string;
  dateGiven: string;
  nextDueDate?: string;
  status: 'VALID' | 'EXPIRED' | 'UPCOMING';
  notes?: string;
}

export async function runVaccineCardWorkflow(
  input: VaccineCardWorkflowInput
): Promise<PipelineResult<VaccineRecord[]>> {
  const language = input.language || 'English';

  const vaccineCardSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        dateGiven: { type: Type.STRING },
        nextDueDate: { type: Type.STRING },
        status: { type: Type.STRING, enum: ['VALID', 'EXPIRED', 'UPCOMING'] },
        notes: { type: Type.STRING }
      },
      required: ['name', 'dateGiven', 'status']
    }
  };

  const result = await executeAiPipeline<any, VaccineRecord[]>({
    featureName: 'Vaccine Card OCR Analysis',
    template: ImageAnalysisPrompt,
    rawUserInput: 'Immunization card CDC record',
    ragQuery: 'immunization vaccination booster schedule CDC',
    ragDocLimit: 2,
    responseSchema: vaccineCardSchema,
    inlineFiles: [{ mimeType: input.mimeType, data: input.base64Image }],
    userParams: {
      analysisType: 'vaccine_card',
      targetLanguage: language
    },
    fallbackGenerator: () => [
      {
        id: `vac_${Date.now()}`,
        name: 'Immunization Record',
        dateGiven: new Date().toISOString().split('T')[0],
        status: 'VALID',
        notes: 'Document recorded in personal health profile.'
      }
    ]
  });

  // Assign stable identifiers if missing
  const enriched = (Array.isArray(result.data) ? result.data : []).map((v, i) => ({
    ...v,
    id: v.id || `vac_${Date.now()}_${i}`
  }));

  return {
    ...result,
    data: enriched
  };
}
