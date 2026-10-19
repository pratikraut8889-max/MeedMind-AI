/**
 * MediMind AI - RAG Vector Embeddings & Similarity Utilities
 * Supports Gemini embedding API with graceful fallback to dense medical vectorization.
 */

export const EMBEDDING_DIMENSION = 256;

/**
 * Calculates Cosine Similarity between two normalized vectors: (A · B) / (||A|| * ||B||)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound strictly within [0, 1]
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Fallback Dense Semantic Vectorizer.
 * Generates a deterministic, normalized 256-dim embedding using hashed subwords,
 * clinical term weights, and n-grams. Guarantees consistent vector math even in
 * environments without external API credentials or during network hiccups.
 */
export function generateDenseSemanticVector(text: string, dim = EMBEDDING_DIMENSION): number[] {
  const vector = new Float64Array(dim);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  // Stop words to down-weight
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'for', 'to', 'of', 'or', 'by']);

  // Medical prefix / suffix boosts
  const medicalTokens = new Set([
    'heart', 'chest', 'cardiac', 'myocardial', 'infarction', 'stroke', 'fast', 'brain',
    'blood', 'pressure', 'hypertension', 'systolic', 'diastolic', 'glucose', 'sugar',
    'diabetes', 'a1c', 'hba1c', 'insulin', 'cholesterol', 'ldl', 'hdl', 'triglycerides',
    'creatinine', 'kidney', 'renal', 'egfr', 'bun', 'liver', 'hepatic', 'alt', 'ast',
    'bilirubin', 'wbc', 'white', 'infection', 'fever', 'hemoglobin', 'anemia', 'platelets',
    'emergency', 'pain', 'shortness', 'breath', 'dyspnea', 'hypoglycemia', 'fever', 'sepsis'
  ]);

  words.forEach((word, wIdx) => {
    const isStop = stopWords.has(word);
    const isMed = medicalTokens.has(word);
    const weight = isMed ? 3.5 : isStop ? 0.2 : 1.0;

    // Word hash
    let h = 0;
    for (let i = 0; i < word.length; i++) {
      h = (h << 5) - h + word.charCodeAt(i);
      h |= 0;
    }
    const idx = Math.abs(h) % dim;
    vector[idx] += weight;

    // Character 3-grams for morphological / typo tolerance
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const trigram = word.substring(i, i + 3);
        let th = 0;
        for (let j = 0; j < 3; j++) {
          th = (th << 5) - th + trigram.charCodeAt(j);
          th |= 0;
        }
        const tIdx = Math.abs(th) % dim;
        vector[tIdx] += weight * 0.4;
      }
    }
  });

  // L2 Normalization
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vector[i] * vector[i];
  }
  const mag = Math.sqrt(sumSq) || 1;
  const normalizedVector: number[] = [];
  for (let i = 0; i < dim; i++) {
    normalizedVector.push(vector[i] / mag);
  }

  return normalizedVector;
}

import { getOpenModelClient } from '../openModelClient';
import { getLegacyGeminiConfig } from '../modelConfig';

/**
 * Generates an embedding for text.
 * 
 * Hacktoberfest 2026: Open-source / open-weight RAG architecture.
 * Priority 1: Configured OPEN_MODEL_EMBEDDING_MODEL via OpenAI-compatible endpoint.
 * Priority 2: Deterministic 256-dim Dense Semantic Vectorizer (guaranteed local fallback).
 * 
 * Vector comparison (cosine similarity) remains fully compatible and resilient even when
 * offline or when external embedding providers are not configured.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const clean = text.trim();
  if (!clean) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // 1. Primary Path: Open Model Embedding via provider abstraction
  try {
    const openClient = getOpenModelClient();
    if (openClient.isConfigured()) {
      const openVec = await openClient.embedText(clean);
      if (openVec && openVec.length > 0) {
        return openVec;
      }
    }
  } catch {
    // Graceful fallback to deterministic vectorizer below
  }

  // 2. Optional / Legacy Development Compatibility (only if explicitly enabled)
  const legacyConfig = getLegacyGeminiConfig();
  if (process.env.ENABLE_LEGACY_GEMINI_EMBEDDINGS === 'true' && legacyConfig.isAvailable) {
    try {
      const { getGeminiClient } = await import('../geminiClient');
      const ai = getGeminiClient();
      const result: any = await (ai.models as any).embedContent({
        model: 'gemini-embedding-2-preview',
        contents: clean
      });
      if (result && result.embedding && Array.isArray(result.embedding.values)) {
        return result.embedding.values;
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // 3. Guaranteed Deterministic Fallback: 256-dim dense semantic vector
  return generateDenseSemanticVector(clean);
}
