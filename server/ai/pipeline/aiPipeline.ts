/**
 * Production AI Pipeline Orchestrator.
 * Enforces the standardized clinical decision support pipeline:
 * User Input → Safety Classification → Context Retrieval → Feature-Specific Prompt → Gemini → Structured Output → Validation → Safety Post-Processing → UI
 */

import { Schema } from '@google/genai';
import { getGeminiClient, AI_MODELS, executeWithRetry, recordAiMetrics } from '../geminiClient';
import { sanitizeUserInput, wrapUntrustedDocument } from '../safety/sanitizer';
import { evaluateClinicalSafety, STANDARD_MEDICAL_DISCLAIMER, TriageCheckResult } from '../safety/medicalTriage';
import { executeMedicalRAG, verifyAndBindCitations, CitationSourceDetail } from '../rag';
import { PromptTemplate } from '../prompts/promptRegistry';

export interface PipelineOptions<TInput, TOutput> {
  featureName: string;
  template: PromptTemplate<any>;
  rawUserInput: string;
  userParams: TInput;
  responseSchema?: Schema;
  modelOverride?: string;
  temperature?: number;
  inlineFiles?: Array<{ mimeType: string; data: string }>;
  ragQuery?: string;
  ragDocLimit?: number;
  fallbackGenerator: (safety: TriageCheckResult, error?: any) => TOutput;
  validateOutput?: (output: any) => { valid: boolean; error?: string };
}

export interface PipelineResult<TOutput> {
  success: boolean;
  data: TOutput;
  metadata: {
    feature: string;
    promptVersion: string;
    latencyMs: number;
    safetyTriggered: boolean;
    citations: CitationSourceDetail[];
  };
}

/**
 * Resilient JSON Extractor & Parser.
 * Strips markdown fences, extracts outermost object/array, and fixes minor trailing issues.
 */
export function resilientJsonParse<T>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;

  let cleaned = rawText.trim();

  // Strip Markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt regex extraction of outer JSON object or array
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Continue to fallback
      }
    }
    console.warn('[Resilient JSON Parser] Failed to parse AI output, utilizing domain fallback.');
    return fallback;
  }
}

/**
 * Executes the complete 8-step AI pipeline with clinical guardrails.
 */
export async function executeAiPipeline<TInput, TOutput>(
  options: PipelineOptions<TInput, TOutput>
): Promise<PipelineResult<TOutput>> {
  const startTime = Date.now();
  const {
    featureName,
    template,
    rawUserInput,
    userParams,
    responseSchema,
    modelOverride = AI_MODELS.GENERAL,
    temperature = 0.2,
    inlineFiles = [],
    ragQuery,
    ragDocLimit = 3,
    fallbackGenerator,
    validateOutput
  } = options;

  // Step 1: User Input Sanitization & PII Scrubbing
  const { cleanText, redactedPiiCount } = sanitizeUserInput(rawUserInput || '', 8000);

  // Step 2: Deterministic Pre-LLM Safety Classification
  const safetyCheck = evaluateClinicalSafety(cleanText);

  // Step 3: Context Retrieval (Authoritative Clinical RAG Layer)
  const queryForRag = ragQuery || cleanText;
  const ragResult = queryForRag.length > 2
    ? await executeMedicalRAG(queryForRag, { topK: ragDocLimit, minRelevanceScore: 0.58 })
    : {
        contextString: 'Standard clinical reference consensus.',
        citations: [],
        filteredChunks: [],
        hasSufficientContext: false,
        latencyMs: 0
      };

  // Step 4: Feature-Specific Prompt Construction with Versioned Template
  const promptParams = {
    ...(userParams as any),
    cleanUserInput: cleanText,
    ragContext: ragResult.contextString
  };
  const constructedPrompt = template.buildUserPrompt(promptParams);

  // Step 5: Gemini Model Invocation with Retry, Timeout & Telemetry
  let rawResponseText = '';
  let aiStatus: 'SUCCESS' | 'ERROR' | 'FALLBACK' = 'SUCCESS';

  try {
    const ai = getGeminiClient();

    const parts: any[] = [];
    // Attach any inline multimodal files (PDF / image / audio)
    for (const file of inlineFiles) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    }
    parts.push({ text: constructedPrompt });

    const response = await executeWithRetry(
      () =>
        ai.models.generateContent({
          model: modelOverride,
          contents: { parts },
          config: {
            systemInstruction: template.systemInstruction,
            temperature,
            ...(responseSchema
              ? {
                  responseMimeType: 'application/json',
                  responseSchema
                }
              : {})
          }
        }),
      {
        featureName,
        maxRetries: 2,
        timeoutMs: inlineFiles.length > 0 ? 45000 : 30000
      }
    );

    rawResponseText = response.text || '';
    if (!rawResponseText.trim()) {
      throw new Error('Gemini engine returned empty text response');
    }
  } catch (modelError: any) {
    console.error(`[AI Pipeline Error] Feature: ${featureName} failed:`, modelError?.message || modelError);
    aiStatus = 'FALLBACK';

    const fallbackData = fallbackGenerator(safetyCheck, modelError);
    const latencyMs = Date.now() - startTime;

    recordAiMetrics({
      feature: featureName,
      model: modelOverride,
      promptVersion: template.version,
      latencyMs,
      status: 'FALLBACK',
      errorCode: modelError?.code || modelError?.status?.toString() || 'AI_ERROR'
    });

    return {
      success: false,
      data: fallbackData,
      metadata: {
        feature: featureName,
        promptVersion: template.version,
        latencyMs,
        safetyTriggered: safetyCheck.emergencyActionRequired,
        citations: ragResult.citations
      }
    };
  }

  // Step 6: Structured Output Extraction & Resilient Parsing
  let parsedOutput: any;
  if (responseSchema) {
    const fallbackTemplate = fallbackGenerator(safetyCheck);
    parsedOutput = resilientJsonParse(rawResponseText, fallbackTemplate);
  } else {
    parsedOutput = { text: rawResponseText };
  }

  // Step 7: Schema Validation & Defensive Bounds Check
  if (validateOutput) {
    const validation = validateOutput(parsedOutput);
    if (!validation.valid) {
      console.warn(`[AI Pipeline Validation Warning] ${featureName}: ${validation.error}. Merging with domain fallback.`);
      parsedOutput = { ...fallbackGenerator(safetyCheck), ...parsedOutput };
    }
  }

  // Step 8: Safety Post-Processing & Strict Citation Verification
  const verifiedCitations = verifyAndBindCitations(parsedOutput?.sources, ragResult.citations);
  if (typeof parsedOutput === 'object' && parsedOutput !== null) {
    parsedOutput.sources = verifiedCitations;
  }

  if (safetyCheck.emergencyActionRequired) {
    if (typeof parsedOutput === 'object' && parsedOutput !== null) {
      parsedOutput.urgency = 'emergency';
      parsedOutput.emergencyActionRequired = true;
      if (safetyCheck.immediateInstructions) {
        if (parsedOutput.summary) {
          parsedOutput.summary = `${safetyCheck.immediateInstructions}\n\n${parsedOutput.summary}`;
        }
        if (parsedOutput.advice) {
          parsedOutput.advice = `${safetyCheck.immediateInstructions}\n\n${parsedOutput.advice}`;
        }
      }
      if (safetyCheck.detectedEmergencyFlags.length > 0) {
        parsedOutput.redFlags = Array.from(
          new Set([...(parsedOutput.redFlags || []), ...safetyCheck.detectedEmergencyFlags])
        );
      }
    }
  }

  // Ensure standard medical disclaimer is always attached
  if (typeof parsedOutput === 'object' && parsedOutput !== null && !parsedOutput.disclaimer) {
    parsedOutput.disclaimer = STANDARD_MEDICAL_DISCLAIMER;
  }

  const latencyMs = Date.now() - startTime;

  // Telemetry Audit (zero patient data logged)
  recordAiMetrics({
    feature: featureName,
    model: modelOverride,
    promptVersion: template.version,
    latencyMs,
    status: 'SUCCESS'
  });

  return {
    success: true,
    data: parsedOutput,
    metadata: {
      feature: featureName,
      promptVersion: template.version,
      latencyMs,
      safetyTriggered: safetyCheck.emergencyActionRequired,
      citations: ragResult.citations
    }
  };
}
