/**
 * MediMind AI - Open-Weight Model Client (Provider-Agnostic Interface)
 * 
 * Hacktoberfest 2026: "Build for a Friend"
 * Connects to any OpenAI-compatible inference endpoint hosting open-weight models
 * (Gemma, Llama, Mistral, Qwen, etc. on Groq, Together, Ollama, vLLM, OpenRouter, etc.).
 * 
 * Zero client-side API keys. Zero vendor lock-in. Resilient structured JSON recovery.
 */

import { getOpenModelConfig, OpenModelConfig } from './modelConfig';
import { recordAiMetrics } from './geminiClient';

export interface GenerateOptions {
  featureName?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  modelOverride?: string;
  promptVersion?: string;
  responseFormat?: 'json_object' | 'text';
}

export interface OpenModelProvider {
  name: string;
  isConfigured(): boolean;
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStructured<T>(prompt: string, schema?: any, fallback?: T, options?: GenerateOptions): Promise<T>;
  generateMultimodal?(prompt: string, files: Array<{ mimeType: string; data: string }>, options?: GenerateOptions): Promise<string>;
  embedText?(text: string): Promise<number[]>;
}

/**
 * Resilient JSON Extractor & Cleaner.
 * Handles Markdown fences, leading/trailing conversational filler, and malformed JSON.
 */
export function extractAndParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;

  let cleaned = rawText.trim();

  // Strip Markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt greedy regex match for outermost object {...} or array [...]
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Continue to fallback
      }
    }
  }

  return fallback;
}

export class OpenAICompatibleClient implements OpenModelProvider {
  private config: OpenModelConfig;

  constructor() {
    this.config = getOpenModelConfig();
  }

  public get name(): string {
    return this.config.providerName;
  }

  public isConfigured(): boolean {
    return this.config.isConfigured;
  }

  /**
   * Refreshes configuration from current environment
   */
  public refreshConfig(): void {
    this.config = getOpenModelConfig();
  }

  /**
   * Generates standard text response via OpenAI-compatible /chat/completions
   */
  public async generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const startTime = Date.now();
    const model = options.modelOverride || this.config.modelName;
    const feature = options.featureName || 'open-model-text';
    const promptVersion = options.promptVersion || 'v1';

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048
    };

    if (options.responseFormat === 'json_object') {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await this.callChatEndpoint(payload, options);
      const text = response.choices?.[0]?.message?.content || '';

      const latencyMs = Date.now() - startTime;
      recordAiMetrics({
        feature,
        model,
        promptVersion,
        latencyMs,
        status: 'SUCCESS'
      });

      return text;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      recordAiMetrics({
        feature,
        model,
        promptVersion,
        latencyMs,
        status: 'ERROR',
        errorCode: error?.code || error?.status?.toString() || 'OPEN_MODEL_ERROR'
      });
      throw error;
    }
  }

  /**
   * Generates structured JSON output with automatic single-repair retry if model output is malformed.
   */
  public async generateStructured<T>(
    prompt: string,
    schema?: any,
    fallback?: T,
    options: GenerateOptions = {}
  ): Promise<T> {
    const feature = options.featureName || 'open-model-structured';
    const model = options.modelOverride || this.config.modelName;

    // Inject schema guidance into prompt if schema provided
    let augmentedPrompt = prompt;
    if (schema) {
      augmentedPrompt += `\n\nCRITICAL REQUIREMENT: Output MUST be strictly valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}\nReturn ONLY the JSON object. Do NOT wrap in conversational text.`;
    }

    try {
      const rawText = await this.generateText(augmentedPrompt, {
        ...options,
        responseFormat: 'json_object',
        featureName: feature
      });

      const parsed = extractAndParseJson<T | null>(rawText, null);
      if (parsed !== null) {
        return parsed;
      }

      // Single repair attempt with targeted repair prompt
      console.warn(`[OpenModelClient] Initial JSON parse failed for ${feature}. Attempting repair prompt...`);
      const repairPrompt = `The following text was supposed to be strictly valid JSON, but contained syntax errors:\n\n${rawText.slice(0, 1500)}\n\nPlease repair it and output ONLY the valid JSON object without markdown or commentary.`;
      
      const repairedText = await this.generateText(repairPrompt, {
        ...options,
        responseFormat: 'json_object',
        temperature: 0.1,
        featureName: `${feature}-repair`
      });

      const repairedParsed = extractAndParseJson<T | null>(repairedText, null);
      if (repairedParsed !== null) {
        return repairedParsed;
      }

      console.warn(`[OpenModelClient] Repair prompt failed for ${feature}. Returning domain fallback.`);
      return fallback as T;
    } catch (err: any) {
      console.error(`[OpenModelClient] Generation error in ${feature}:`, err?.message || err);
      return fallback as T;
    }
  }

  /**
   * Multimodal vision processing if vision model is configured or inline images are supported
   */
  public async generateMultimodal(
    prompt: string,
    files: Array<{ mimeType: string; data: string }>,
    options: GenerateOptions = {}
  ): Promise<string> {
    const visionModel = this.config.visionModelName || this.config.modelName;
    const feature = options.featureName || 'open-model-vision';
    const startTime = Date.now();

    const contentParts: any[] = [];
    contentParts.push({ type: 'text', text: prompt });

    for (const file of files) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${file.mimeType};base64,${file.data}`
        }
      });
    }

    const messages: Array<{ role: 'system' | 'user'; content: any }> = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: contentParts });

    const payload = {
      model: visionModel,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048
    };

    try {
      const response = await this.callChatEndpoint(payload, options);
      const text = response.choices?.[0]?.message?.content || '';

      const latencyMs = Date.now() - startTime;
      recordAiMetrics({
        feature,
        model: visionModel,
        promptVersion: options.promptVersion || 'v1',
        latencyMs,
        status: 'SUCCESS'
      });

      return text;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      recordAiMetrics({
        feature,
        model: visionModel,
        promptVersion: options.promptVersion || 'v1',
        latencyMs,
        status: 'ERROR',
        errorCode: error?.code || error?.status?.toString() || 'VISION_ERROR'
      });
      throw error;
    }
  }

  /**
   * Generates embeddings via OpenAI-compatible /embeddings endpoint
   */
  public async embedText(text: string): Promise<number[]> {
    if (!this.config.isConfigured || !text.trim()) {
      return [];
    }

    const url = `${this.config.baseUrl}/embeddings`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.embeddingModelName,
          input: text.slice(0, 2000)
        })
      });

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      const embedding = json?.data?.[0]?.embedding;
      if (Array.isArray(embedding)) {
        return embedding;
      }
    } catch {
      // Gracefully fall back to local semantic vectorizer
    }

    return [];
  }

  /**
   * Internal fetch executor with timeout and error handling
   */
  private async callChatEndpoint(payload: any, options: GenerateOptions): Promise<any> {
    const url = `${this.config.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(`Open Model API call failed with status ${res.status}: ${errorBody.slice(0, 300)}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

// Singleton provider instance
let globalOpenModelClient: OpenAICompatibleClient | null = null;

export function getOpenModelClient(): OpenAICompatibleClient {
  if (!globalOpenModelClient) {
    globalOpenModelClient = new OpenAICompatibleClient();
  }
  return globalOpenModelClient;
}
