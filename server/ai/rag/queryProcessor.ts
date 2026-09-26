/**
 * MediMind AI - RAG Query Processor
 * Step 1 in Pipeline: User Question → Query Processing
 * Performs clinical normalization, entity extraction, medical synonym expansion, and intent classification.
 */

import { ProcessedQuery } from './types';
import { getEmbedding, generateDenseSemanticVector } from './embeddings';

// Authoritative clinical synonym and concept expansion map
const MEDICAL_TAXONOMY: Record<string, string[]> = {
  // Cardiovascular
  'heart attack': ['myocardial infarction', 'cardiac arrest', 'coronary artery', 'angina', 'chest pain', 'troponin'],
  'chest pain': ['angina pectoris', 'coronary syndrome', 'substernal pressure', 'heart attack', 'dyspnea'],
  'hypertension': ['high blood pressure', 'systolic', 'diastolic', 'elevated bp', 'hypertensive crisis'],
  'blood pressure': ['systolic', 'diastolic', 'hypertension', 'hypotension', 'mm hg'],
  'cholesterol': ['lipid panel', 'ldl', 'hdl', 'triglycerides', 'hyperlipidemia', 'atherosclerosis', 'statin'],

  // Neurological & Emergency
  'stroke': ['cerebrovascular accident', 'cva', 'ischemic stroke', 'fast protocol', 'facial drooping', 'transient ischemic attack', 'tia'],
  'seizure': ['epilepsy', 'convulsion', 'postictal', 'neurological'],

  // Metabolic & Endocrine
  'diabetes': ['blood glucose', 'fasting blood sugar', 'hba1c', 'glycated hemoglobin', 'hyperglycemia', 'hypoglycemia', 'insulin'],
  'blood sugar': ['blood glucose', 'fasting glucose', 'a1c', 'hba1c', 'prediabetes', 'diabetes mellitus'],
  'thyroid': ['tsh', 'free t4', 'free t3', 'hypothyroidism', 'hyperthyroidism'],

  // Hematology
  'anemia': ['hemoglobin', 'hgb', 'hematocrit', 'rbc', 'red blood cells', 'iron deficiency', 'ferritin'],
  'cbc': ['complete blood count', 'hemoglobin', 'white blood cells', 'wbc', 'platelets', 'hematocrit'],
  'infection': ['white blood cells', 'wbc', 'leukocytosis', 'neutrophils', 'lymphocytes', 'fever', 'crp'],

  // Renal & Hepatic
  'kidney': ['creatinine', 'egfr', 'bun', 'blood urea nitrogen', 'renal failure', 'glomerular filtration', 'nephropathy'],
  'renal': ['kidney function', 'creatinine', 'egfr', 'proteinuria', 'bun'],
  'liver': ['alt', 'ast', 'bilirubin', 'hepatic', 'alkaline phosphatase', 'alanine aminotransferase', 'jaundice'],
  'hepatic': ['liver function', 'transaminases', 'alt', 'ast', 'cirrhosis'],

  // General Symptoms
  'fever': ['pyrexia', 'body temperature', 'hyperthermia', 'chills', 'rigors', 'infection']
};

/**
 * Normalizes user text and strips non-alphanumeric noise while preserving medical symbols.
 */
export function normalizeQueryText(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\-\.\/]/g, ' ')
    .replace(/\s+/g, ' ');
}

const COMMON_STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'with', 'what', 'how', 'who', 'why', 'when', 'where',
  'which', 'that', 'this', 'does', 'have', 'from', 'can', 'you', 'your', 'about',
  'into', 'been', 'will', 'would', 'could', 'should', 'more', 'some', 'than', 'them',
  'their', 'there', 'they', 'were', 'said', 'also', 'after', 'before', 'make', 'like',
  'just', 'know', 'take', 'come', 'think', 'give', 'look', 'find', 'want', 'tell',
  'replace', 'change', 'brake', 'pads', 'movie', 'film', 'city', 'jupiter', 'planet', 'car'
]);

/**
 * Extracts medical terms and expands clinical synonyms.
 */
export function extractAndExpandMedicalTerms(query: string): {
  medicalTerms: string[];
  expandedKeywords: string[];
} {
  const normalized = normalizeQueryText(query);
  const foundTerms = new Set<string>();
  const expanded = new Set<string>();

  for (const [key, synonyms] of Object.entries(MEDICAL_TAXONOMY)) {
    if (normalized.includes(key)) {
      foundTerms.add(key);
      synonyms.forEach((syn) => expanded.add(syn));
    }
    // Check if any synonym is present in the query
    for (const syn of synonyms) {
      if (normalized.includes(syn)) {
        foundTerms.add(key);
        foundTerms.add(syn);
        synonyms.forEach((s) => expanded.add(s));
        break;
      }
    }
  }

  // Tokenize individual words excluding common stop words
  const words = normalized.split(' ').filter((w) => w.length > 2 && !COMMON_STOP_WORDS.has(w));
  words.forEach((w) => expanded.add(w));

  return {
    medicalTerms: Array.from(foundTerms),
    expandedKeywords: Array.from(expanded)
  };
}

/**
 * Classifies query intent to guide retriever prioritization.
 */
export function classifyQueryIntent(
  query: string,
  medicalTerms: string[]
): ProcessedQuery['intent'] {
  const lower = query.toLowerCase();

  const emergencyKeywords = [
    'crushing pain', 'radiating pain', 'cannot breathe', 'slurred speech',
    'face droop', 'arm weak', 'passed out', 'unconscious', 'emergency',
    'coughing blood', 'severe chest pain'
  ];
  if (emergencyKeywords.some((k) => lower.includes(k))) {
    return 'emergency';
  }

  const diagnosticKeywords = [
    'range', 'test', 'result', 'marker', 'panel', 'mg/dl', 'normal range',
    'high level', 'low level', 'positive', 'negative', 'biomarker', 'reference'
  ];
  if (diagnosticKeywords.some((k) => lower.includes(k))) {
    return 'diagnostic';
  }

  const medicationKeywords = [
    'side effect', 'interaction', 'dose', 'medication', 'pill', 'prescription',
    'statin', 'antibiotic', 'contraindication'
  ];
  if (medicationKeywords.some((k) => lower.includes(k))) {
    return 'medication';
  }

  if (medicalTerms.length > 0) {
    return 'informational';
  }

  return 'general';
}

/**
 * Step 1 Execution: Query Processing
 * Transforms raw user question into an enriched clinical search representation.
 */
export async function processUserQuery(rawQuery: string): Promise<ProcessedQuery> {
  const normalizedQuery = normalizeQueryText(rawQuery);
  const { medicalTerms, expandedKeywords } = extractAndExpandMedicalTerms(rawQuery);
  const intent = classifyQueryIntent(rawQuery, medicalTerms);

  // Generate vector representation for semantic search
  const textForEmbedding = `${normalizedQuery} ${medicalTerms.join(' ')} ${expandedKeywords.slice(0, 8).join(' ')}`.trim();
  const embedding = await getEmbedding(textForEmbedding);

  return {
    rawQuery,
    normalizedQuery,
    intent,
    medicalTerms,
    expandedKeywords,
    embedding
  };
}
