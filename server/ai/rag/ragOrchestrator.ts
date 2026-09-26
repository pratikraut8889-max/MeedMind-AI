/**
 * MediMind AI - Production RAG Orchestrator
 * Connects the complete RAG pipeline:
 * User Question → Query Processing → Retriever → Relevant Medical Documents → Context Filtering → Gemini → Structured Answer → Citations
 */

import { ProcessedQuery, RAGRetrievalResult, RetrievalOptions, CitationSourceDetail, ScoredChunk } from './types';
import { processUserQuery } from './queryProcessor';
import { getMedicalRetriever, DEFAULT_MIN_RELEVANCE_SCORE, DEFAULT_TOP_K } from './retriever';
import { filterAndFormatMedicalContext } from './contextFilter';
import { knowledgeRegistry } from './knowledgeRegistry';

/**
 * Executes the full clinical RAG retrieval and context-filtering pipeline.
 */
export async function executeMedicalRAG(
  rawQuery: string,
  options?: RetrievalOptions
): Promise<RAGRetrievalResult> {
  const startTime = Date.now();
  const minScore = options?.minRelevanceScore ?? DEFAULT_MIN_RELEVANCE_SCORE;
  const topK = options?.topK ?? DEFAULT_TOP_K;

  // Step 1: Query Processing
  const processedQuery: ProcessedQuery = await processUserQuery(rawQuery);

  // Step 2: Retriever Execution (Pluggable Provider)
  const retriever = getMedicalRetriever();
  const retrievedChunks: ScoredChunk[] = await retriever.retrieve(processedQuery, {
    topK,
    minRelevanceScore: minScore,
    strictThreshold: options?.strictThreshold,
    filterByOrganization: options?.filterByOrganization,
    filterByCategory: options?.filterByCategory
  });

  // Step 3: Context Filtering & Anti-Hallucination Guardrails
  const filtered = filterAndFormatMedicalContext(retrievedChunks, {
    minRelevanceScore: minScore
  });

  const latencyMs = Date.now() - startTime;

  return {
    query: processedQuery,
    retrievedChunks,
    filteredChunks: filtered.filteredChunks,
    citations: filtered.citations,
    contextString: filtered.contextString,
    hasSufficientContext: filtered.hasSufficientContext,
    relevanceThresholdUsed: minScore,
    latencyMs
  };
}

/**
 * Citation Sanitizer & Anti-Fabrication Filter.
 * Verifies that any citations returned in LLM outputs correspond strictly to
 * actual retrieved and qualified documents. Prevents the model from fabricating sources.
 */
export function verifyAndBindCitations(
  candidateCitations: any[],
  verifiedCitations: CitationSourceDetail[]
): CitationSourceDetail[] {
  if (!verifiedCitations || verifiedCitations.length === 0) {
    return [];
  }

  // If candidate citations are provided by LLM, match against verified ones
  if (Array.isArray(candidateCitations) && candidateCitations.length > 0) {
    const verifiedUrls = new Set(verifiedCitations.map((v) => v.url.toLowerCase()));
    const verifiedTitles = new Set(verifiedCitations.map((v) => v.title.toLowerCase()));

    const matched = candidateCitations
      .map((c) => {
        const urlMatch = verifiedCitations.find(
          (v) => c.url && v.url.toLowerCase().includes(c.url.toLowerCase())
        );
        if (urlMatch) return urlMatch;

        const titleMatch = verifiedCitations.find(
          (v) => c.title && v.title.toLowerCase().includes(c.title.toLowerCase())
        );
        if (titleMatch) return titleMatch;

        return null;
      })
      .filter((c): c is CitationSourceDetail => c !== null);

    if (matched.length > 0) {
      return matched;
    }
  }

  // Default to the authoritative citations retrieved by the RAG layer
  return verifiedCitations;
}

/**
 * Backwards compatibility helper for existing pipeline invocations.
 */
export async function retrieveMedicalKnowledge(
  queryText: string,
  maxResults = 3
): Promise<{
  documents: any[];
  citations: CitationSourceDetail[];
  contextString: string;
  hasSufficientContext: boolean;
}> {
  const result = await executeMedicalRAG(queryText, { topK: maxResults });
  return {
    documents: result.filteredChunks.map((c) => c.chunk),
    citations: result.citations,
    contextString: result.contextString,
    hasSufficientContext: result.hasSufficientContext
  };
}
