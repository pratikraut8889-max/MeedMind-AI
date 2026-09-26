/**
 * Workflow 5: Emergency Triage (Text & Audio)
 * Prioritizes patient life safety above all else with rapid emergency classification.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { EmergencyTriagePrompt } from '../prompts/promptRegistry';
import { STANDARD_MEDICAL_DISCLAIMER } from '../safety/medicalTriage';

export interface EmergencyTriageInput {
  inputData: string; // text string or base64 audio
  inputType: 'text' | 'audio';
  language?: string;
}

export interface EmergencyTriageOutput {
  advice: string;
  emergencyActionRequired: boolean;
  disclaimer: string;
}

export async function runEmergencyTriageWorkflow(
  input: EmergencyTriageInput
): Promise<PipelineResult<EmergencyTriageOutput>> {
  const language = input.language || 'English';
  const isAudio = input.inputType === 'audio';

  const inlineFiles: any[] = [];
  let rawText = '';

  if (isAudio) {
    inlineFiles.push({
      mimeType: 'audio/wav',
      data: input.inputData
    });
    rawText = 'Patient speaks urgent emergency symptoms via audio.';
  } else {
    rawText = String(input.inputData || '');
  }

  return executeAiPipeline<any, EmergencyTriageOutput>({
    featureName: 'Emergency Clinical Triage',
    template: EmergencyTriagePrompt,
    rawUserInput: rawText,
    ragQuery: `${rawText} emergency triage resuscitation 911 life support chest pain shortness of breath`,
    ragDocLimit: 2,
    temperature: 0.1,
    inlineFiles,
    userParams: {
      reportedSymptoms: isAudio ? 'Voice recording attached' : rawText,
      targetLanguage: language,
      isAudio
    },
    fallbackGenerator: (safety) => ({
      advice: safety.immediateInstructions ||
        'If you are experiencing severe chest pain, shortness of breath, sudden numbness, or heavy bleeding, call 911 (or local emergency 112) immediately. Sit down, stay calm, and do not attempt to drive yourself.',
      emergencyActionRequired: true,
      disclaimer: STANDARD_MEDICAL_DISCLAIMER
    })
  });
}
