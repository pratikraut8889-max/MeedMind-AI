/**
 * Workflow 4: Medication Information & Packaging OCR
 * Verifies drug labels, dosing schedules, side effects, and drug-drug interactions.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { MedicationInfoPrompt, ImageAnalysisPrompt } from '../prompts/promptRegistry';
import { medicationAnalysisSchema } from '../schemas/aiSchemas';

export interface MedicationWorkflowInput {
  base64Image?: string;
  mimeType?: string;
  medicationName?: string;
  dosage?: string;
  concurrentMeds?: string;
  language?: string;
}

export interface MedicationWorkflowOutput {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  possibleSideEffects?: string[];
  precautions?: string[];
  whenToContactDoctor?: string;
}

export async function runMedicationWorkflow(
  input: MedicationWorkflowInput
): Promise<PipelineResult<MedicationWorkflowOutput>> {
  const language = input.language || 'English';

  if (input.base64Image) {
    return executeAiPipeline<any, MedicationWorkflowOutput>({
      featureName: 'Medication Packaging OCR Analysis',
      template: ImageAnalysisPrompt,
      rawUserInput: 'Medication bottle label packaging',
      ragQuery: 'pharmacology prescription instructions drug label administration',
      ragDocLimit: 2,
      responseSchema: medicationAnalysisSchema,
      inlineFiles: [
        {
          mimeType: input.mimeType || 'image/jpeg',
          data: input.base64Image
        }
      ],
      userParams: {
        analysisType: 'medication_label',
        targetLanguage: language
      },
      fallbackGenerator: () => ({
        name: 'Prescription Medication',
        dosage: 'Refer to pharmacy printed label',
        frequency: 'As directed by physician',
        instructions: 'Please inspect the physical bottle label directly or verify with your dispensing pharmacist.',
        possibleSideEffects: ['Refer to manufacturer package insert for complete safety details.'],
        precautions: ['Keep out of reach of children.', 'Do not modify dose without doctor approval.'],
        whenToContactDoctor: 'Contact doctor immediately if you experience hives, breathing difficulty, or severe dizziness.'
      })
    });
  }

  // Text-based medication information query
  return executeAiPipeline<any, MedicationWorkflowOutput>({
    featureName: 'Medication Pharmacology Information',
    template: MedicationInfoPrompt,
    rawUserInput: `${input.medicationName || ''} ${input.dosage || ''}`,
    ragQuery: `${input.medicationName || ''} pharmacology side effects interactions`,
    ragDocLimit: 3,
    responseSchema: medicationAnalysisSchema,
    userParams: {
      medicationName: input.medicationName || 'Medication',
      dosage: input.dosage || '',
      otherMeds: input.concurrentMeds || '',
      targetLanguage: language
    },
    fallbackGenerator: () => ({
      name: input.medicationName || 'Medication',
      dosage: input.dosage || 'Standard dose',
      frequency: 'Follow prescriber instructions',
      instructions: 'Take exactly as prescribed by your doctor or pharmacist.',
      possibleSideEffects: ['Mild stomach upset', 'Drowsiness or mild fatigue'],
      precautions: ['Verify interactions with any over-the-counter supplements.'],
      whenToContactDoctor: 'Report severe adverse reactions or rash to your physician immediately.'
    })
  });
}
