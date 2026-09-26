/**
 * MediMind AI - RAG Context Filtering Layer
 * Step 3 in Pipeline: Relevant Medical Documents → Context Filtering
 * Enforces relevance thresholding, suppresses low-quality / out-of-scope context,
 * deduplicates passages, and formats strict clinical evidence blocks.
 */

import { ScoredChunk, CitationSourceDetail, RAGRetrievalResult, ProcessedQuery } from './types';
import { DEFAULT_MIN_RELEVANCE_SCORE } from './retriever';

export interface ContextFilterOptions {
  minRelevanceScore?: number;
  maxTokens?: number; // Approximate token limit (charCount / 4)
  allowFallbackContext?: boolean;
}

export interface FilteredContext {
  filteredChunks: ScoredChunk[];
  citations: CitationSourceDetail[];
  contextString: string;
  hasSufficientContext: boolean;
  rejectedCount: number;
}

/**
 * Filters and sanitizes retrieved chunks before presenting them to Gemini.
 * Guarantees that only high-confidence, relevant medical documents reach the LLM.
 */
export function filterAndFormatMedicalContext(
  scoredChunks: ScoredChunk[],
  options?: ContextFilterOptions
): FilteredContext {
  const minThreshold = options?.minRelevanceScore ?? DEFAULT_MIN_RELEVANCE_SCORE;
  const maxTokens = options?.maxTokens ?? 1800;

  // 1. Strict Relevance Filter: Suppress low-quality or irrelevant retrieval results
  const qualifiedChunks = scoredChunks.filter(
    (item) => item.score >= minThreshold && item.meetsThreshold
  );

  const rejectedCount = scoredChunks.length - qualifiedChunks.length;

  // If no retrieved chunk meets the threshold, reject context completely
  if (qualifiedChunks.length === 0) {
    return {
      filteredChunks: [],
      citations: [],
      contextString:
        'GROUNDING NOTICE: No authoritative clinical documents met the minimum relevance threshold for this query. ' +
        'CRITICAL RULE: You must NOT fabricate, hallucinate, or cite any clinical sources, document IDs, or external URLs. ' +
        'Provide cautious, general educational information and advise the patient to consult a qualified physician.',
      hasSufficientContext: false,
      rejectedCount
    };
  }

  // 2. Passage Deduplication (by sourceId and sectionTitle)
  const seenPassages = new Set<string>();
  const uniqueChunks: ScoredChunk[] = [];
  let tokenBudget = 0;

  for (const item of qualifiedChunks) {
    const key = `${item.chunk.sourceId}:${item.chunk.sectionTitle || item.chunk.id}`;
    if (seenPassages.has(key)) continue;
    seenPassages.add(key);

    const chunkTokens = item.chunk.tokenCount || Math.ceil(item.chunk.content.length / 4);
    if (tokenBudget + chunkTokens > maxTokens && uniqueChunks.length > 0) {
      break; // Preserve token budget
    }

    uniqueChunks.push(item);
    tokenBudget += chunkTokens;
  }

  // 3. Construct Verified Citations
  const today = new Date().toISOString().split('T')[0];
  const citations: CitationSourceDetail[] = uniqueChunks.map((item) => ({
    title: item.chunk.sourceTitle,
    organization: item.chunk.organization,
    url: item.chunk.url,
    documentIdentifier: item.chunk.documentIdentifier,
    publicationDate: item.chunk.publicationDate,
    accessDate: today,
    excerpt: item.chunk.content.slice(0, 160) + '...',
    relevanceScore: item.score
  }));

  // 4. Build Structured Evidence Prompt Block
  const contextString = uniqueChunks
    .map((item, idx) => {
      const c = item.chunk;
      return [
        `[AUTHORITATIVE EVIDENCE #${idx + 1}]`,
        `Title: "${c.sourceTitle}"`,
        `Organization: ${c.organization}`,
        `Document Identifier: ${c.documentIdentifier}`,
        c.publicationDate ? `Publication Date: ${c.publicationDate}` : '',
        `Relevance Score: ${(item.score * 100).toFixed(1)}%`,
        `Clinical Domain: ${c.clinicalDomain}`,
        `URL: ${c.url}`,
        `Verified Content Passage:`,
        `"${c.content}"`
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return {
    filteredChunks: uniqueChunks,
    citations,
    contextString,
    hasSufficientContext: true,
    rejectedCount
  };
}
