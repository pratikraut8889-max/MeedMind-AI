/**
 * Workflow 1: General Health Assistant Chat
 * Powered by versioned prompts, RAG grounding, and deterministic safety triage.
 */

import { executeAiPipeline, PipelineResult } from '../pipeline/aiPipeline';
import { GeneralHealthChatPrompt } from '../prompts/promptRegistry';
import { chatResponseSchema } from '../schemas/aiSchemas';
import { STANDARD_MEDICAL_DISCLAIMER } from '../safety/medicalTriage';

export interface ChatWorkflowInput {
  query: string;
  language?: string;
  history?: Array<{ role: string; content: string }>;
  userContext?: { currentMeds?: string; knownConditions?: string };
}

export interface ChatWorkflowOutput {
  urgency: 'information' | 'routine' | 'urgent' | 'emergency';
  summary: string;
  possibleExplanations: string[];
  redFlags: string[];
  recommendedNextSteps: string[];
  questionsForDoctor: string[];
  emergencyActionRequired?: boolean;
  disclaimer: string;
  sources?: Array<{ title: string; organization: string; url: string }>;
}

export async function runChatWorkflow(input: ChatWorkflowInput): Promise<PipelineResult<ChatWorkflowOutput>> {
  const language = input.language || 'English';

  const historySnippet = Array.isArray(input.history)
    ? input.history
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content.slice(0, 400)}`)
        .join('\n')
    : '';

  return executeAiPipeline<any, ChatWorkflowOutput>({
    featureName: 'General Health Assistant Chat',
    template: GeneralHealthChatPrompt,
    rawUserInput: input.query,
    ragQuery: input.query,
    ragDocLimit: 3,
    responseSchema: chatResponseSchema,
    userParams: {
      userQuery: input.query,
      targetLanguage: language,
      conversationHistorySnippet: historySnippet,
      userContext: input.userContext
    },
    validateOutput: (out) => {
      if (!out || typeof out.summary !== 'string') {
        return { valid: false, error: 'Missing summary' };
      }
      return { valid: true };
    },
    fallbackGenerator: (safety, error) => ({
      urgency: safety.urgency,
      emergencyActionRequired: safety.emergencyActionRequired,
      summary: safety.immediateInstructions || 
        'MediMind AI is temporarily experiencing high consultation demand. If you are having chest pain, shortness of breath, or an urgent medical crisis, please contact emergency services (911/112) immediately.',
      possibleExplanations: [
        'Detailed differential evaluation temporarily delayed.',
        'Symptom assessment should be verified with a healthcare provider.'
      ],
      redFlags: safety.detectedEmergencyFlags.length > 0 
        ? safety.detectedEmergencyFlags 
        : ['Severe unremitting pain', 'Sudden shortness of breath', 'High fever (>103°F / 39.4°C)'],
      recommendedNextSteps: [
        'Rest and stay hydrated.',
        'Record symptom timeline and severity.',
        'Consult a certified physician for clinical examination.'
      ],
      questionsForDoctor: [
        'What could be causing these symptoms given my medical history?',
        'Are there any diagnostic tests or labs indicated at this stage?'
      ],
      disclaimer: STANDARD_MEDICAL_DISCLAIMER
    })
  });
}
