/**
 * Workflow 6: Doctor-Letter Generation
 * Synthesizes lab analyses into an objective clinical brief for attending physicians.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { DoctorLetterPrompt } from '../prompts/promptRegistry';
import { doctorLetterSchema } from '../schemas/aiSchemas';
import { STANDARD_MEDICAL_DISCLAIMER } from '../safety/medicalTriage';

export interface DoctorLetterWorkflowInput {
  patientName?: string;
  analysis: any;
  language?: string;
}

export interface DoctorLetterWorkflowOutput {
  patientName: string;
  date: string;
  summary: string;
  findings: string[];
  criticalNotes: string[];
  questionsForDoctor: string[];
  disclaimer: string;
}

export async function runDoctorLetterWorkflow(
  input: DoctorLetterWorkflowInput
): Promise<PipelineResult<DoctorLetterWorkflowOutput>> {
  const language = input.language || 'English';
  const patientName = input.patientName || 'The Patient';
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return executeAiPipeline<any, DoctorLetterWorkflowOutput>({
    featureName: 'Doctor-Letter Clinical Brief',
    template: DoctorLetterPrompt,
    rawUserInput: `${patientName} clinical summary`,
    ragQuery: 'clinical documentation physician consultation summary findings',
    ragDocLimit: 2,
    responseSchema: doctorLetterSchema,
    userParams: {
      patientName,
      analysisData: input.analysis,
      targetLanguage: language
    },
    fallbackGenerator: (safety) => ({
      patientName,
      date: currentDate,
      summary:
        'The patient has compiled this laboratory summary using MediMind AI for educational reference and guided clinical discussion with their physician.',
      findings: [
        'Biomarker values extracted from patient-provided laboratory document.',
        'Please review the original laboratory report for verification.'
      ],
      criticalNotes: safety.detectedEmergencyFlags.length > 0 
        ? safety.detectedEmergencyFlags 
        : ['Routine physician follow-up indicated.'],
      questionsForDoctor: [
        'How do these laboratory values compare to my previous baseline tests?',
        'Do any markers require repeating or further specialized investigation?',
        'Are there any lifestyle or medication adjustments recommended?'
      ],
      disclaimer: STANDARD_MEDICAL_DISCLAIMER
    })
  });
}
