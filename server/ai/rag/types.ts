/**
 * MediMind AI - Production Retrieval-Augmented Generation (RAG) Architecture
 * Core Type Definitions & Knowledge Source Abstraction
 */

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  documentIdentifier: string;
  sourceTitle: string;
  organization: string;
  url: string;
  publicationDate?: string;
  sectionTitle?: string;
  content: string;
  tokenCount?: number;
  embedding?: number[];
  keywords: string[];
  clinicalDomain: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  organization: string;
  url: string;
  documentIdentifier: string;
  publicationDate?: string;
  category: string;
  evidenceLevel?: string;
  summary: string;
  chunks: KnowledgeChunk[];
  metadata?: Record<string, any>;
}

export interface ProcessedQuery {
  rawQuery: string;
  normalizedQuery: string;
  intent: 'emergency' | 'diagnostic' | 'medication' | 'informational' | 'general';
  medicalTerms: string[];
  expandedKeywords: string[];
  embedding?: number[];
}

export interface RetrievalOptions {
  topK?: number;
  minRelevanceScore?: number;
  strictThreshold?: boolean;
  filterByOrganization?: string[];
  filterByCategory?: string[];
}

export interface ScoredChunk {
  chunk: KnowledgeChunk;
  score: number; // Normalized 0.0 - 1.0
  denseSimilarity: number;
  lexicalSimilarity: number;
  matchedKeywords: string[];
  meetsThreshold: boolean;
}

export interface CitationSourceDetail {
  title: string;
  organization: string;
  url: string;
  documentIdentifier: string;
  publicationDate?: string;
  accessDate: string;
  excerpt: string;
  relevanceScore: number;
}

export interface RAGRetrievalResult {
  query: ProcessedQuery;
  retrievedChunks: ScoredChunk[];
  filteredChunks: ScoredChunk[];
  citations: CitationSourceDetail[];
  contextString: string;
  hasSufficientContext: boolean;
  relevanceThresholdUsed: number;
  latencyMs: number;
}

/**
 * Pluggable Retrieval Provider Interface.
 * Allows switching the retrieval provider (In-Memory, pgvector, Firestore Vector, Pinecone)
 * without altering any workflow or application logic.
 */
export interface IMedicalRetriever {
  readonly providerName: string;
  retrieve(query: ProcessedQuery, options?: RetrievalOptions): Promise<ScoredChunk[]>;
  indexChunks(chunks: KnowledgeChunk[]): Promise<void>;
  removeSourceChunks(sourceId: string): Promise<void>;
  getStats(): { indexedChunksCount: number; provider: string };
}
