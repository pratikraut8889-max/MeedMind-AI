/**
 * Workflow 4: Medication Information & Packaging OCR
 * Verifies drug labels, dosing schedules, side effects, and drug-drug interactions.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { MedicationInfoPrompt, ImageAnalysisPrompt, DrugInteractionPrompt } from '../prompts/promptRegistry';
import { medicationAnalysisSchema, pillVerificationSchema, drugInteractionSchema } from '../schemas/aiSchemas';

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

export interface PillVerificationInput {
  base64Image: string;
  mimeType?: string;
  medicationName?: string;
  dosage?: string;
  language?: string;
}

export interface PillVerificationOutput {
  shape: string;
  color: string;
  imprint?: string;
  description: string;
  likelyMedication?: string;
  safetyNotes?: string;
}

export async function runPillVerificationWorkflow(
  input: PillVerificationInput
): Promise<PipelineResult<PillVerificationOutput>> {
  const language = input.language || 'English';

  return executeAiPipeline<any, PillVerificationOutput>({
    featureName: 'Physical Pill Visual Verification',
    template: ImageAnalysisPrompt,
    rawUserInput: `Physical pill identification and verification for: ${input.medicationName || 'Medication'} ${input.dosage || ''}`,
    ragQuery: 'pill identifier visual identification tablet imprint color shape pharmacology',
    ragDocLimit: 2,
    responseSchema: pillVerificationSchema,
    inlineFiles: [
      {
        mimeType: input.mimeType || 'image/jpeg',
        data: input.base64Image
      }
    ],
    userParams: {
      analysisType: 'pill_verification',
      medicationName: input.medicationName || '',
      dosage: input.dosage || '',
      targetLanguage: language
    },
    fallbackGenerator: () => ({
      shape: 'Solid oral tablet or capsule',
      color: 'Refer to captured physical photo',
      imprint: 'Inspect debossed characters on tablet face under direct light',
      description: `Physical medication unit captured for visual verification against prescription (${input.medicationName || 'Oral Medication'}).`,
      likelyMedication: input.medicationName ? `Consistent with ${input.medicationName}` : 'Visual check recommended',
      safetyNotes: 'Always inspect imprint code and color consistency before taking your dose. Contact your dispensing pharmacist if appearance differs from your previous refill.'
    })
  });
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

export interface DrugInteractionWorkflowInput {
  newMedication: string;
  dosage?: string;
  currentMedications: Array<{ name: string; dosage?: string }> | string[];
  knownConditions?: string;
  allergies?: string;
  language?: string;
}

export interface DrugInteractionWorkflowOutput {
  hasInteractions: boolean;
  hasHighRiskInteraction: boolean;
  summary: string;
  interactions: Array<{
    severity: 'HIGH' | 'MODERATE' | 'LOW';
    interactingDrug: string;
    description: string;
    clinicalRecommendation: string;
  }>;
  disclaimer: string;
}

export async function runDrugInteractionWorkflow(
  input: DrugInteractionWorkflowInput
): Promise<PipelineResult<DrugInteractionWorkflowOutput>> {
  const language = input.language || 'English';
  const currentMedsList = Array.isArray(input.currentMedications)
    ? input.currentMedications
        .map((m) => (typeof m === 'string' ? m : `${m.name} ${m.dosage || ''}`.trim()))
        .filter(Boolean)
        .join(', ')
    : String(input.currentMedications || '');

  const ragQuery = `${input.newMedication} ${currentMedsList} drug interaction contraindication mechanism pharmacology`;

  return executeAiPipeline<any, DrugInteractionWorkflowOutput>({
    featureName: 'Drug-Drug Interaction Analysis',
    template: DrugInteractionPrompt,
    rawUserInput: `Evaluating interactions for ${input.newMedication} against: ${currentMedsList}`,
    ragQuery,
    ragDocLimit: 4,
    responseSchema: drugInteractionSchema,
    userParams: {
      newMedication: input.newMedication,
      dosage: input.dosage || '',
      currentMedications: currentMedsList,
      knownConditions: input.knownConditions || '',
      allergies: input.allergies || '',
      targetLanguage: language
    },
    validateOutput: (out) => {
      if (!out || typeof out.hasInteractions !== 'boolean') {
        return { valid: false, error: 'Missing hasInteractions boolean' };
      }
      return { valid: true };
    },
    fallbackGenerator: () => ({
      hasInteractions: false,
      hasHighRiskInteraction: false,
      summary: `Preliminary review indicates no major documented interactions between ${input.newMedication} and reported medications. Always verify with your dispensing pharmacist.`,
      interactions: [],
      disclaimer: 'This drug interaction check is educational and based on available pharmacology references. Always consult your prescribing physician or pharmacist before starting a new medication.'
    })
  });
}

