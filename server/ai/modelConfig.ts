/**
 * MediMind AI - Centralized Model & Open-Source AI Configuration
 * 
 * Hacktoberfest 2026: "Build for a Friend" Open-Weight AI Architecture
 * Prioritizes open-weight models (Gemma family preferred) via any OpenAI-compatible inference endpoint.
 * Zero proprietary lock-in. Server-side only (never exposed to client bundle).
 */

export interface OpenModelConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  visionModelName: string;
  embeddingModelName: string;
  providerName: string;
  timeoutMs: number;
  isConfigured: boolean;
  preferredFamily: 'Gemma' | 'Llama' | 'Mistral' | 'Open-Weight';
}

export interface LegacyGeminiConfig {
  apiKey: string;
  modelName: string;
  isAvailable: boolean;
}

export function getOpenModelConfig(): OpenModelConfig {
  const apiKey = process.env.OPEN_MODEL_API_KEY || '';
  const baseUrl = (process.env.OPEN_MODEL_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const modelName = process.env.OPEN_MODEL_NAME || 'gemma2-9b-it';
  const visionModelName = process.env.OPEN_MODEL_VISION_MODEL || '';
  const embeddingModelName = process.env.OPEN_MODEL_EMBEDDING_MODEL || 'bge-small-en-v1.5';
  const providerName = process.env.OPEN_MODEL_PROVIDER_NAME || 
    (baseUrl.includes('groq') ? 'Groq (Open-Weight Gemma)' :
     baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? 'Ollama / Local (Gemma)' :
     baseUrl.includes('openrouter') ? 'OpenRouter (Open-Weight)' :
     baseUrl.includes('together') ? 'Together AI (Open-Weight)' : 'OpenAI-Compatible Open Provider');

  return {
    apiKey,
    baseUrl,
    modelName,
    visionModelName,
    embeddingModelName,
    providerName,
    timeoutMs: parseInt(process.env.OPEN_MODEL_TIMEOUT_MS || '35000', 10),
    isConfigured: Boolean(apiKey || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')),
    preferredFamily: 'Gemma'
  };
}

export function getLegacyGeminiConfig(): LegacyGeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return {
    apiKey,
    modelName: 'gemini-2.5-flash',
    isAvailable: Boolean(apiKey)
  };
}
