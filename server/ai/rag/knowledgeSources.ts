/**
 * MediMind AI - Knowledge Sources and Backward-Compatible RAG Bridge
 */

export * from './types';
export type {
  CitationSourceDetail as CitationSource,
  KnowledgeChunk as KnowledgeDocument
} from './types';
export {
  retrieveMedicalKnowledge,
  executeMedicalRAG,
  verifyAndBindCitations
} from './ragOrchestrator';
export {
  AUTHORITATIVE_SOURCES as TRUSTED_MEDICAL_KB,
  knowledgeRegistry
} from './knowledgeRegistry';
export {
  getMedicalRetriever,
  setMedicalRetriever,
  InMemoryVectorRetriever
} from './retriever';
export { runRagEvaluation } from './evaluation/ragEvaluator';
export { RAG_EVALUATION_DATASET } from './evaluation/evalDataset';
