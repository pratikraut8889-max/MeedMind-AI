/**
 * Production AI Pipeline Orchestrator.
 * 
 * Hacktoberfest 2026: Open-Weight AI Architecture (Gemma preferred).
 * Enforces the standardized clinical decision support pipeline:
 * User Input → Safety Classification → Context Retrieval → Feature-Specific Prompt
 *   → Open-Weight Model Engine → Structured Output → Validation → Safety Post-Processing → UI
 * 
 * Never crashes. Never leaks PII in telemetry. Provider-agnostic.
 */

import { getOpenModelClient } from '../openModelClient';
import { getOpenModelConfig, getLegacyGeminiConfig } from '../modelConfig';
import { recordAiMetrics } from '../geminiClient';
import { sanitizeUserInput } from '../safety/sanitizer';
import { evaluateClinicalSafety, STANDARD_MEDICAL_DISCLAIMER, TriageCheckResult } from '../safety/medicalTriage';
import { executeMedicalRAG, verifyAndBindCitations, CitationSourceDetail } from '../rag';
import { PromptTemplate } from '../prompts/promptRegistry';

export interface PipelineOptions<TInput, TOutput> {
  featureName: string;
  template: PromptTemplate<any>;
  rawUserInput: string;
  userParams: TInput;
  responseSchema?: any;
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
    model?: string;
    provider?: string;
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
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt regex extraction of outer JSON object or array
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Continue to fallback
      }
    }
    return fallback;
  }
}

/**
 * Executes the complete 8-step AI pipeline with open-weight intelligence and clinical guardrails.
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
    modelOverride,
    temperature = 0.2,
    inlineFiles = [],
    ragQuery,
    ragDocLimit = 3,
    fallbackGenerator,
    validateOutput
  } = options;

  const openConfig = getOpenModelConfig();
  const activeModelName = modelOverride || openConfig.modelName;

  // Step 1: User Input Sanitization & PII Scrubbing
  const { cleanText } = sanitizeUserInput(rawUserInput || '', 8000);

  // Step 2: Deterministic Pre-LLM Safety Classification
  const safetyCheck = evaluateClinicalSafety(cleanText);

  // Step 3: Context Retrieval (Authoritative Clinical RAG Layer)
  const queryForRag = ragQuery || cleanText;
  const ragResult = queryForRag.length > 2
    ? await executeMedicalRAG(queryForRag, { topK: ragDocLimit, minRelevanceScore: 0.55 })
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

  // Step 5: Open-Weight Model Invocation (Primary Path)
  let rawResponseText = '';
  let parsedOutput: any = null;
  const openClient = getOpenModelClient();
  let usedProvider = openConfig.providerName;
  let usedModel = activeModelName;

  try {
    if (openClient.isConfigured()) {
      // Primary: Open Model Inference (Gemma / OpenAI-compatible endpoint)
      if (inlineFiles.length > 0 && openConfig.visionModelName) {
        rawResponseText = await openClient.generateMultimodal(constructedPrompt, inlineFiles, {
          featureName,
          systemInstruction: template.systemInstruction,
          temperature,
          promptVersion: template.version,
          modelOverride: openConfig.visionModelName
        });
        usedModel = openConfig.visionModelName;
        if (responseSchema) {
          parsedOutput = resilientJsonParse(rawResponseText, fallbackGenerator(safetyCheck));
        } else {
          parsedOutput = { text: rawResponseText };
        }
      } else if (responseSchema) {
        parsedOutput = await openClient.generateStructured(
          constructedPrompt,
          responseSchema,
          fallbackGenerator(safetyCheck),
          {
            featureName,
            systemInstruction: template.systemInstruction,
            temperature,
            promptVersion: template.version,
            modelOverride: activeModelName
          }
        );
      } else {
        rawResponseText = await openClient.generateText(constructedPrompt, {
          featureName,
          systemInstruction: template.systemInstruction,
          temperature,
          promptVersion: template.version,
          modelOverride: activeModelName
        });
        parsedOutput = { text: rawResponseText };
      }
    } else {
      // Secondary: Optional Legacy Gemini Compatibility fallback if open provider not yet configured
      const legacyConfig = getLegacyGeminiConfig();
      if (legacyConfig.isAvailable) {
        usedProvider = 'Legacy Gemini (Optional Dev Compatibility)';
        usedModel = legacyConfig.modelName;

        const { getGeminiClient, executeWithRetry } = await import('../geminiClient');
        const ai = getGeminiClient();

        const parts: any[] = [];
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
              model: legacyConfig.modelName,
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
        if (responseSchema) {
          parsedOutput = resilientJsonParse(rawResponseText, fallbackGenerator(safetyCheck));
        } else {
          parsedOutput = { text: rawResponseText };
        }
      } else {
        // Neither open model endpoint nor legacy key configured: utilize domain fallback generator
        console.warn(`[AI Pipeline Notice] Open Model endpoint not configured. Generating domain fallback for ${featureName}.`);
        parsedOutput = fallbackGenerator(safetyCheck);
      }
    }
  } catch (modelError: any) {
    console.error(`[AI Pipeline Error] Feature: ${featureName} failed:`, modelError?.message || modelError);

    const fallbackData = fallbackGenerator(safetyCheck, modelError);
    const latencyMs = Date.now() - startTime;

    recordAiMetrics({
      feature: featureName,
      model: usedModel,
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
        citations: ragResult.citations,
        model: usedModel,
        provider: usedProvider
      }
    };
  }

  // Ensure output is assigned if rawResponseText was processed without parsedOutput
  if (!parsedOutput) {
    if (responseSchema) {
      parsedOutput = resilientJsonParse(rawResponseText, fallbackGenerator(safetyCheck));
    } else {
      parsedOutput = { text: rawResponseText || 'Analysis completed.' };
    }
  }

  // Step 6: Schema Validation & Defensive Bounds Check
  if (validateOutput) {
    const validation = validateOutput(parsedOutput);
    if (!validation.valid) {
      console.warn(`[AI Pipeline Validation Warning] ${featureName}: ${validation.error}. Merging with domain fallback.`);
      parsedOutput = { ...fallbackGenerator(safetyCheck), ...parsedOutput };
    }
  }

  // Step 7: Safety Post-Processing & Strict Citation Verification
  // The model must NOT invent citations. Only retrieved, verified medical citations are bound.
  const verifiedCitations = verifyAndBindCitations(parsedOutput?.sources, ragResult.citations);
  if (typeof parsedOutput === 'object' && parsedOutput !== null) {
    parsedOutput.sources = verifiedCitations;
  }

  // Step 8: Deterministic Emergency Override (independent of LLM)
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
    model: usedModel,
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
      citations: ragResult.citations,
      model: usedModel,
      provider: usedProvider
    }
  };
}
