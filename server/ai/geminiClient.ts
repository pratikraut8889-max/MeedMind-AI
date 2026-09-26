import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!apiKey) {
      console.warn('[Gemini Client] Warning: Neither GEMINI_API_KEY nor API_KEY is set in environment variables. AI operations will fail until provided.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

export const AI_MODELS = {
  GENERAL: 'gemini-3.8-flash',
  TTS: 'gemini-3.1-flash-tts-preview',
} as const;

export interface AiRequestMetadata {
  requestId?: string;
  feature: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  status: 'SUCCESS' | 'ERROR' | 'FALLBACK';
  estimatedTokens?: number;
  errorCode?: string;
  timestamp: string;
}

// In-memory rolling metrics ring buffer (no PII, purely operational metrics)
const MAX_METRICS_LOG = 100;
const metricsLog: AiRequestMetadata[] = [];

export function recordAiMetrics(meta: Omit<AiRequestMetadata, 'timestamp'>): void {
  const entry: AiRequestMetadata = {
    ...meta,
    timestamp: new Date().toISOString()
  };
  metricsLog.push(entry);
  if (metricsLog.length > MAX_METRICS_LOG) {
    metricsLog.shift();
  }
  // Structured log for cloud observability (guaranteed zero PII)
  console.log(`[AI Telemetry] feature=${entry.feature} model=${entry.model} v=${entry.promptVersion} status=${entry.status} latency=${entry.latencyMs}ms`);
}

export function getRecentAiMetrics(): readonly AiRequestMetadata[] {
  return [...metricsLog];
}

/**
 * Executes a Gemini operation with jittered exponential backoff and timeout protection.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    timeoutMs?: number;
    featureName?: string;
  } = {}
): Promise<T> {
  const { maxRetries = 2, initialDelayMs = 600, timeoutMs = 35000, featureName = 'ai-operation' } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      // Execute with timeout safeguard
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`AI operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]).finally(() => {
        clearTimeout(timeoutHandle);
      });

      return result;
    } catch (err: any) {
      attempt++;
      const isRateLimit = err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('rate limit');
      const isTransient = isRateLimit || err?.status >= 500 || err?.message?.includes('fetch failed') || err?.message?.includes('socket hang up');

      if (attempt > maxRetries || !isTransient) {
        console.error(`[AI Execution Failed] ${featureName} after ${attempt} attempts:`, err?.message || err);
        throw err;
      }

      // Add full jitter to prevent thundering herds
      const jitter = Math.random() * 300;
      const waitTime = delay + jitter;
      console.warn(`[AI Retry ${attempt}/${maxRetries}] ${featureName} waiting ${Math.round(waitTime)}ms due to: ${err?.message || 'transient error'}`);
      await new Promise(r => setTimeout(r, waitTime));
      delay *= 2; // Exponential backoff
    }
  }

  throw new Error(`AI operation [${featureName}] exceeded maximum retry attempts.`);
}

