/**
 * MediMind AI - Pluggable Medical Retriever
 * Step 2 in Pipeline: Query Processing → Retriever → Relevant Medical Documents
 * Features hybrid dense-semantic and clinical keyword matching with strict relevance scoring.
 */

import { IMedicalRetriever, KnowledgeChunk, ProcessedQuery, RetrievalOptions, ScoredChunk } from './types';
import { cosineSimilarity } from './embeddings';
import { knowledgeRegistry } from './knowledgeRegistry';

export const DEFAULT_MIN_RELEVANCE_SCORE = 0.58; // Minimum threshold to prevent irrelevant/low-quality noise
export const DEFAULT_TOP_K = 3;

/**
 * Calculates keyword/lexical match score between expanded query keywords and chunk text.
 */
function calculateLexicalScore(query: ProcessedQuery, chunk: KnowledgeChunk): { score: number; matchedKeywords: string[] } {
  const contentLower = chunk.content.toLowerCase();
  const titleLower = chunk.sourceTitle.toLowerCase();
  const sectionLower = (chunk.sectionTitle || '').toLowerCase();
  const chunkKeywordsLower = chunk.keywords.map((k) => k.toLowerCase());

  const matchedKeywords: string[] = [];
  let points = 0;

  for (const term of query.expandedKeywords) {
    const termLower = term.toLowerCase();
    if (termLower.length < 3) continue;

    let matchedInChunk = false;

    // Direct tag match in chunk metadata keywords (highest weight)
    if (chunkKeywordsLower.some((k) => k.includes(termLower) || termLower.includes(k))) {
      points += 3.0;
      matchedInChunk = true;
    } else if (titleLower.includes(termLower) || sectionLower.includes(termLower)) {
      points += 2.0;
      matchedInChunk = true;
    } else if (contentLower.includes(termLower)) {
      points += 1.0;
      matchedInChunk = true;
    }

    if (matchedInChunk) {
      matchedKeywords.push(term);
    }
  }

  // Normalize lexical score to [0, 1] range (sigmoid-like scaling based on match volume)
  const normalizedLexical = Math.min(1, points / 8);
  return { score: normalizedLexical, matchedKeywords };
}

/**
 * In-Memory Vector Retriever Implementation.
 * Implements IMedicalRetriever for fast, deterministic semantic vector scoring.
 */
export class InMemoryVectorRetriever implements IMedicalRetriever {
  public readonly providerName = 'InMemoryVectorRetriever (Dense Hybrid)';
  private chunksCache: KnowledgeChunk[] = [];

  constructor() {
    this.refreshIndex();
  }

  public refreshIndex(): void {
    this.chunksCache = knowledgeRegistry.getAllChunks();
  }

  public async indexChunks(chunks: KnowledgeChunk[]): Promise<void> {
    // Indexes into the central knowledge registry
    chunks.forEach((c) => {
      const source = knowledgeRegistry.getSource(c.sourceId);
      if (source) {
        if (!source.chunks.some((ch) => ch.id === c.id)) {
          source.chunks.push(c);
        }
      }
    });
    this.refreshIndex();
  }

  public async removeSourceChunks(sourceId: string): Promise<void> {
    knowledgeRegistry.unregisterSource(sourceId);
    this.refreshIndex();
  }

  public getStats(): { indexedChunksCount: number; provider: string } {
    return {
      indexedChunksCount: this.chunksCache.length,
      provider: this.providerName
    };
  }

  /**
   * Retrieves top-K medical chunks scored against the query vector and clinical keywords.
   */
  public async retrieve(query: ProcessedQuery, options?: RetrievalOptions): Promise<ScoredChunk[]> {
    this.refreshIndex();
    const minThreshold = options?.minRelevanceScore ?? DEFAULT_MIN_RELEVANCE_SCORE;
    const topK = options?.topK ?? DEFAULT_TOP_K;

    const scoredList: ScoredChunk[] = [];

    for (const chunk of this.chunksCache) {
      // Optional filters
      if (options?.filterByOrganization && options.filterByOrganization.length > 0) {
        if (!options.filterByOrganization.includes(chunk.organization)) {
          continue;
        }
      }
      if (options?.filterByCategory && options.filterByCategory.length > 0) {
        if (!options.filterByCategory.includes(chunk.clinicalDomain)) {
          continue;
        }
      }

      // 1. Dense Semantic Similarity
      const denseSim = query.embedding && chunk.embedding
        ? cosineSimilarity(query.embedding, chunk.embedding)
        : 0;

      // 2. Lexical & Clinical Concept Matching
      const { score: lexicalScore, matchedKeywords } = calculateLexicalScore(query, chunk);

      // 3. Hybrid Combined Score (65% semantic embedding, 35% lexical keyword/entity)
      let combinedScore = 0.65 * denseSim + 0.35 * lexicalScore;

      // Extra bonus if high-priority medical term matched in critical domain
      if (matchedKeywords.length >= 2 && denseSim >= 0.5) {
        combinedScore = Math.min(1.0, combinedScore + 0.05);
      }

      // Domain Alignment Guardrail: If a query has zero recognized medical terms and zero matched clinical keywords,
      // penalize the combined score to prevent unrelated or non-medical queries from leaking into clinical context.
      if (query.medicalTerms.length === 0 && matchedKeywords.length === 0) {
        combinedScore *= 0.5;
      }

      const meetsThreshold = combinedScore >= minThreshold;

      scoredList.push({
        chunk,
        score: parseFloat(combinedScore.toFixed(4)),
        denseSimilarity: parseFloat(denseSim.toFixed(4)),
        lexicalSimilarity: parseFloat(lexicalScore.toFixed(4)),
        matchedKeywords,
        meetsThreshold
      });
    }

    // Sort descending by combined relevance score
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList.slice(0, topK);
  }
}

/**
 * Provider Singleton & Dependency Injection.
 * Allows replacing the active retriever implementation (e.g. pgvector, Firestore, Pinecone)
 * without touching downstream workflows.
 */
let activeRetriever: IMedicalRetriever = new InMemoryVectorRetriever();

export function getMedicalRetriever(): IMedicalRetriever {
  return activeRetriever;
}

export function setMedicalRetriever(retriever: IMedicalRetriever): void {
  console.log(`[RAG Architecture] Active retriever switched to: ${retriever.providerName}`);
  activeRetriever = retriever;
}
