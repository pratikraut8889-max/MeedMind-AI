/**
 * MediMind AI - RAG Retrieval Quality Evaluator
 * Runs quantitative retrieval benchmarks across the clinical evaluation dataset.
 */

import { RAG_EVALUATION_DATASET, EvalTestCase } from './evalDataset';
import { executeMedicalRAG } from '../ragOrchestrator';

export interface EvalMetricSummary {
  timestamp: string;
  totalQueries: number;
  positiveQueries: number;
  negativeQueries: number;
  top1Accuracy: number; // % where top result matched expected doc
  top3Recall: number;   // % where expected doc appeared in top 3
  mrr: number;          // Mean Reciprocal Rank
  negativeRejectionRate: number; // Specificity (% irrelevant queries rejected)
  averageLatencyMs: number;
  overallScore: number; // Weighted composite benchmark score (0-100)
  testResults: Array<{
    id: string;
    query: string;
    isNegative: boolean;
    expectedDocIds: string[];
    retrievedDocIds: string[];
    topScore: number;
    hasContext: boolean;
    passed: boolean;
    latencyMs: number;
  }>;
}

export async function runRagEvaluation(customDataset?: EvalTestCase[]): Promise<EvalMetricSummary> {
  const dataset = customDataset || RAG_EVALUATION_DATASET;
  const testResults: EvalMetricSummary['testResults'] = [];

  let top1Matches = 0;
  let top3Matches = 0;
  let reciprocalRankSum = 0;
  let totalPositive = 0;
  let totalNegative = 0;
  let correctRejections = 0;
  let totalLatency = 0;

  for (const testCase of dataset) {
    const startTime = Date.now();
    const result = await executeMedicalRAG(testCase.query, { topK: 3, minRelevanceScore: 0.58 });
    const latencyMs = Date.now() - startTime;
    totalLatency += latencyMs;

    const retrievedDocIds = result.filteredChunks.map((c) => c.chunk.documentIdentifier);
    const topScore = result.retrievedChunks.length > 0 ? result.retrievedChunks[0].score : 0;

    if (testCase.isNegativeQuery) {
      totalNegative++;
      // A negative test case passes if NO medical context met the threshold or zero docs returned
      const rejectedProperly = !result.hasSufficientContext || retrievedDocIds.length === 0;
      if (rejectedProperly) {
        correctRejections++;
      }
      testResults.push({
        id: testCase.id,
        query: testCase.query,
        isNegative: true,
        expectedDocIds: [],
        retrievedDocIds,
        topScore,
        hasContext: result.hasSufficientContext,
        passed: rejectedProperly,
        latencyMs
      });
    } else {
      totalPositive++;
      let foundRank = 0;
      for (let i = 0; i < retrievedDocIds.length; i++) {
        if (testCase.expectedDocumentIds.includes(retrievedDocIds[i])) {
          foundRank = i + 1;
          break;
        }
      }

      if (foundRank === 1) {
        top1Matches++;
      }
      if (foundRank > 0 && foundRank <= 3) {
        top3Matches++;
        reciprocalRankSum += 1 / foundRank;
      }

      const passed = foundRank > 0;
      testResults.push({
        id: testCase.id,
        query: testCase.query,
        isNegative: false,
        expectedDocIds: testCase.expectedDocumentIds,
        retrievedDocIds,
        topScore,
        hasContext: result.hasSufficientContext,
        passed,
        latencyMs
      });
    }
  }

  const top1Accuracy = totalPositive > 0 ? (top1Matches / totalPositive) * 100 : 0;
  const top3Recall = totalPositive > 0 ? (top3Matches / totalPositive) * 100 : 0;
  const mrr = totalPositive > 0 ? reciprocalRankSum / totalPositive : 0;
  const negativeRejectionRate = totalNegative > 0 ? (correctRejections / totalNegative) * 100 : 100;
  const averageLatencyMs = Math.round(totalLatency / dataset.length);

  // Composite score: 40% top-1, 30% top-3 recall, 30% negative rejection specificity
  const overallScore = Math.round(
    0.4 * top1Accuracy + 0.3 * top3Recall + 0.3 * negativeRejectionRate
  );

  return {
    timestamp: new Date().toISOString(),
    totalQueries: dataset.length,
    positiveQueries: totalPositive,
    negativeQueries: totalNegative,
    top1Accuracy: parseFloat(top1Accuracy.toFixed(1)),
    top3Recall: parseFloat(top3Recall.toFixed(1)),
    mrr: parseFloat(mrr.toFixed(3)),
    negativeRejectionRate: parseFloat(negativeRejectionRate.toFixed(1)),
    averageLatencyMs,
    overallScore,
    testResults
  };
}
