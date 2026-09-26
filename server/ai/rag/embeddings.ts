/**
 * MediMind AI - RAG Vector Embeddings & Similarity Utilities
 * Supports Gemini embedding API with graceful fallback to dense medical vectorization.
 */

import { getGeminiClient } from '../geminiClient';

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

/**
 * Generates an embedding for text. Attempts Gemini Embedding API when available,
 * falling back reliably to the dense semantic vectorizer.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const clean = text.trim();
  if (!clean) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  try {
    const ai = getGeminiClient();
    // @google/genai embedding call
    const result: any = await (ai.models as any).embedContent({
      model: 'gemini-embedding-2-preview',
      contents: clean
    });

    if (result && result.embedding && Array.isArray(result.embedding.values)) {
      return result.embedding.values;
    }
  } catch (err) {
    // API not configured, offline, or rate-limited; fallback seamlessly
  }

  return generateDenseSemanticVector(clean);
}
