import { Router, Request, Response } from 'express';
import { Modality } from '@google/genai';
import { getGeminiClient, AI_MODELS, getRecentAiMetrics } from '../ai/geminiClient';
import { sanitizeUserInput } from '../ai/safety/sanitizer';
import { validateBase64Upload } from '../middleware/fileUploadValidator';
import { createRateLimiter } from '../middleware/rateLimiter';
import { runChatWorkflow } from '../ai/workflows/chatWorkflow';
import { runReportAnalysisWorkflow } from '../ai/workflows/reportAnalysisWorkflow';
import { runSymptomAnalysisWorkflow } from '../ai/workflows/symptomAnalysisWorkflow';
import { runMedicationWorkflow } from '../ai/workflows/medicationWorkflow';
import { runEmergencyTriageWorkflow } from '../ai/workflows/emergencyTriageWorkflow';
import { runDoctorLetterWorkflow } from '../ai/workflows/doctorLetterWorkflow';
import { runBodyScanWorkflow, runVaccineCardWorkflow } from '../ai/workflows/imageAnalysisWorkflow';
import { executeAiPipeline } from '../ai/pipeline/aiPipeline';
import { QuickSummaryPrompt } from '../ai/prompts/promptRegistry';
import { STANDARD_MEDICAL_DISCLAIMER } from '../ai/safety/medicalTriage';
import {
  knowledgeRegistry,
  executeMedicalRAG,
  getMedicalRetriever,
  runRagEvaluation,
  RAG_EVALUATION_DATASET
} from '../ai/rag';

export const aiRouter = Router();

// Rate limits: Chat allows 40 req/min, file analysis allows 20 req/min
const chatLimiter = createRateLimiter({ windowMs: 60000, max: 40, message: 'Chat rate limit reached. Please wait a moment.' });
const uploadLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Analysis rate limit reached. Please wait a moment before uploading more documents.' });

/**
 * 1. AI Health Assistant Chat (Workflow 1)
 * POST /api/ai/chat
 */
aiRouter.post('/chat', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, language = 'English', history = [], userContext } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'A non-empty text query is required.' });
      return;
    }

    const result = await runChatWorkflow({
      query,
      language,
      history,
      userContext
    });

    res.status(200).json({
      success: true,
      data: {
        ...result.data,
        sources: result.metadata.citations,
        metadata: {
          feature: result.metadata.feature,
          promptVersion: result.metadata.promptVersion,
          latencyMs: result.metadata.latencyMs
        }
      }
    });
  } catch (error: any) {
    console.error('[AI Chat Route Error]', error?.message || error);
    res.status(500).json({
      error: 'AI_SERVICE_ERROR',
      message: 'Unable to process health consultation at this time. If this is an emergency, contact local emergency services immediately.'
    });
  }
});

/**
 * 2. Medical Report Analyzer (Workflow 2)
 * POST /api/ai/analyze-report
 */
aiRouter.post('/analyze-report', uploadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileBase64, mimeType, language = 'English', currentMeds = '', location = '' } = req.body;

    const validation = validateBase64Upload(fileBase64, mimeType);
    if (!validation.valid || !validation.cleanBase64 || !validation.mimeType) {
      res.status(400).json({ error: 'FILE_VALIDATION_FAILED', message: validation.error || 'Invalid file upload.' });
      return;
    }

    const result = await runReportAnalysisWorkflow({
      fileBase64: validation.cleanBase64,
      mimeType: validation.mimeType,
      language,
      currentMeds,
      location
    });

    res.status(200).json({
      success: true,
      data: {
        ...result.data,
        sources: result.metadata.citations,
        metadata: {
          feature: result.metadata.feature,
          promptVersion: result.metadata.promptVersion,
          latencyMs: result.metadata.latencyMs
        }
      }
    });
  } catch (error: any) {
    console.error('[Analyze Report Route Error]', error?.message || error);
    res.status(500).json({
      error: 'ANALYSIS_ERROR',
      message: 'Failed to analyze the medical document. Ensure the file is clear, readable, and under 15MB.'
    });
  }
});

/**
 * 3. Emergency Audio / Text Triage (Workflow 5)
 * POST /api/ai/emergency-triage
 */
aiRouter.post('/emergency-triage', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputData, inputType = 'text', language = 'English' } = req.body;

    if (!inputData) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'inputData is required' });
      return;
    }

    let cleanData = inputData;
    if (inputType === 'audio') {
      const validation = validateBase64Upload(inputData, 'audio/wav');
      if (!validation.valid || !validation.cleanBase64) {
        res.status(400).json({ error: 'AUDIO_VALIDATION_FAILED', message: 'Invalid audio recording' });
        return;
      }
      cleanData = validation.cleanBase64;
    }

    const result = await runEmergencyTriageWorkflow({
      inputData: cleanData,
      inputType,
      language
    });

    res.status(200).json({
      success: true,
      advice: result.data.advice,
      disclaimer: result.data.disclaimer,
      emergencyActionRequired: result.data.emergencyActionRequired,
      metadata: {
        latencyMs: result.metadata.latencyMs
      }
    });
  } catch (error: any) {
    console.error('[Emergency Triage Route Error]', error?.message || error);
    res.status(500).json({
      error: 'EMERGENCY_TRIAGE_ERROR',
      advice: 'If you have severe chest pain, shortness of breath, or uncontrolled bleeding, please dial emergency medical services (911 / 112) immediately.'
    });
  }
});

/**
 * 4. Visual Symptom Checker (Workflow 3)
 * POST /api/ai/symptom-check
 */
aiRouter.post('/symptom-check', uploadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Image, mimeType = 'image/jpeg', description = '', language = 'English' } = req.body;

    let cleanBase64: string | undefined;
    let cleanMime: string | undefined;

    if (base64Image) {
      const validation = validateBase64Upload(base64Image, mimeType);
      if (!validation.valid || !validation.cleanBase64) {
        res.status(400).json({ error: 'IMAGE_VALIDATION_FAILED', message: validation.error || 'Invalid image.' });
        return;
      }
      cleanBase64 = validation.cleanBase64;
      cleanMime = validation.mimeType;
    }

    const result = await runSymptomAnalysisWorkflow({
      base64Image: cleanBase64,
      mimeType: cleanMime,
      description,
      language
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('[Visual Symptom Route Error]', error?.message || error);
    res.status(500).json({
      error: 'VISUAL_SYMPTOM_ERROR',
      message: 'Failed to inspect symptom. Please check input clarity and try again.'
    });
  }
});

/**
 * 5. Medication Packaging Analysis (Workflow 4)
 * POST /api/ai/medication-check
 */
aiRouter.post('/medication-check', uploadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Image, mimeType = 'image/jpeg', medicationName, dosage, concurrentMeds, language = 'English' } = req.body;

    let cleanBase64: string | undefined;
    let cleanMime: string | undefined;

    if (base64Image) {
      const validation = validateBase64Upload(base64Image, mimeType);
      if (!validation.valid || !validation.cleanBase64) {
        res.status(400).json({ error: 'IMAGE_VALIDATION_FAILED', message: validation.error || 'Invalid image.' });
        return;
      }
      cleanBase64 = validation.cleanBase64;
      cleanMime = validation.mimeType;
    }

    const result = await runMedicationWorkflow({
      base64Image: cleanBase64,
      mimeType: cleanMime,
      medicationName,
      dosage,
      concurrentMeds,
      language
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('[Medication Check Route Error]', error?.message || error);
    res.status(500).json({
      error: 'MEDICATION_CHECK_ERROR',
      message: 'Could not analyze medication information. Please ensure label text is well-lit and in focus.'
    });
  }
});

/**
 * 6. Doctor Letter Generation (Workflow 6)
 * POST /api/ai/doctor-letter
 */
aiRouter.post('/doctor-letter', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { analysis, patientName = 'The Patient', language = 'English' } = req.body;

    if (!analysis) {
      res.status(400).json({ error: 'MISSING_ANALYSIS', message: 'Analysis data is required to draft letter.' });
      return;
    }

    const result = await runDoctorLetterWorkflow({
      analysis,
      patientName,
      language
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('[Doctor Letter Route Error]', error?.message || error);
    res.status(500).json({
      error: 'DOCTOR_LETTER_ERROR',
      message: 'Failed to generate physician letter. Please try again.'
    });
  }
});

/**
 * 7. Vaccine Card Analysis (Workflow 7)
 * POST /api/ai/vaccines
 */
aiRouter.post('/vaccines', uploadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Image, mimeType = 'image/jpeg', language = 'English' } = req.body;

    const validation = validateBase64Upload(base64Image, mimeType);
    if (!validation.valid || !validation.cleanBase64 || !validation.mimeType) {
      res.status(400).json({ error: 'IMAGE_VALIDATION_FAILED', message: validation.error || 'Invalid image.' });
      return;
    }

    const result = await runVaccineCardWorkflow({
      base64Image: validation.cleanBase64,
      mimeType: validation.mimeType,
      language
    });

    res.status(200).json({
      success: true,
      vaccines: result.data
    });
  } catch (error: any) {
    console.error('[Vaccine Card Route Error]', error?.message || error);
    res.status(500).json({
      error: 'VACCINE_ANALYSIS_ERROR',
      message: 'Failed to extract immunization records from image.'
    });
  }
});

/**
 * 8. Body Scan Analysis (Workflow 7)
 * POST /api/ai/body-scan
 */
aiRouter.post('/body-scan', uploadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Image, mimeType = 'image/jpeg', language = 'English' } = req.body;

    const validation = validateBase64Upload(base64Image, mimeType);
    if (!validation.valid || !validation.cleanBase64 || !validation.mimeType) {
      res.status(400).json({ error: 'IMAGE_VALIDATION_FAILED', message: validation.error || 'Invalid image.' });
      return;
    }

    const result = await runBodyScanWorkflow({
      base64Image: validation.cleanBase64,
      mimeType: validation.mimeType,
      language
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('[Body Scan Route Error]', error?.message || error);
    res.status(500).json({
      error: 'BODY_SCAN_ERROR',
      message: 'Failed to analyze body scan image.'
    });
  }
});

/**
 * 9. Text-to-Speech Generation (Gemini TTS)
 * POST /api/ai/tts
 */
aiRouter.post('/tts', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, language = 'English' } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Text is required for TTS' });
      return;
    }

    const { cleanText } = sanitizeUserInput(text, 1000);

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: AI_MODELS.TTS,
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(404).json({ error: 'AUDIO_GENERATION_FAILED', message: 'Could not generate speech audio' });
      return;
    }

    res.status(200).json({
      success: true,
      audioBase64: base64Audio,
      sampleRate: 24000
    });
  } catch (error: any) {
    console.error('[TTS Route Error]', error?.message || error);
    res.status(500).json({
      error: 'TTS_SERVICE_ERROR',
      message: 'Speech synthesis temporarily unavailable.'
    });
  }
});

/**
 * 10. Quick High-Level Executive Summary Generation for Saved Reports
 * POST /api/ai/quick-summary
 */
aiRouter.post('/quick-summary', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName, summary, redFlags = [], labMeasurements = [], language = 'English' } = req.body;

    const result = await executeAiPipeline<any, { text: string }>({
      featureName: 'Report Quick Summary',
      template: QuickSummaryPrompt,
      rawUserInput: `${fileName || ''} ${summary || ''}`,
      ragQuery: `${fileName || ''} summary`,
      ragDocLimit: 2,
      userParams: {
        fileName: fileName || 'Medical Document',
        summary: summary || '',
        redFlags: Array.isArray(redFlags) ? redFlags : [],
        labMeasurements: Array.isArray(labMeasurements) ? labMeasurements : [],
        targetLanguage: language
      },
      fallbackGenerator: () => ({
        text: summary ? `${summary.slice(0, 180)}...` : 'Executive summary currently unavailable.'
      })
    });

    const quickSummary = result.data.text?.trim() || (summary ? `${summary.slice(0, 180)}...` : 'Summary available in report detail.');

    res.status(200).json({
      success: true,
      quickSummary
    });
  } catch (error: any) {
    console.error('[Quick Summary Route Error]', error?.message || error);
    const fallback = req.body.summary ? `${req.body.summary.slice(0, 180)}...` : 'Executive summary currently unavailable.';
    res.status(200).json({
      success: true,
      quickSummary: fallback
    });
  }
});

/**
 * 11. AI Architecture Observability & Health Metrics Endpoint (zero PII)
 * GET /api/ai/metrics
 */
aiRouter.get('/metrics', (req: Request, res: Response): void => {
  const metrics = getRecentAiMetrics();
  res.status(200).json({
    success: true,
    totalTracked: metrics.length,
    recentRequests: metrics
  });
});

/**
 * 12. RAG Subsystem: List Knowledge Sources & Registry Stats
 * GET /api/ai/rag/sources
 */
aiRouter.get('/rag/sources', (_req: Request, res: Response): void => {
  try {
    const stats = knowledgeRegistry.getStats();
    const sources = knowledgeRegistry.getAllSources().map((s) => ({
      id: s.id,
      title: s.title,
      organization: s.organization,
      url: s.url,
      documentIdentifier: s.documentIdentifier,
      publicationDate: s.publicationDate,
      category: s.category,
      evidenceLevel: s.evidenceLevel,
      summary: s.summary,
      chunkCount: s.chunks?.length || 0
    }));

    const retriever = getMedicalRetriever();

    res.status(200).json({
      success: true,
      stats,
      retrieverProvider: retriever.providerName,
      sources
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 13. RAG Subsystem: Direct Semantic Retrieval Inspection
 * POST /api/ai/rag/retrieve
 * Body: { query: string; topK?: number; minScore?: number }
 */
aiRouter.post('/rag/retrieve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, topK = 3, minScore = 0.58, filterOrg, filterCategory } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Query string is required.' });
      return;
    }

    const ragResult = await executeMedicalRAG(query, {
      topK: Number(topK),
      minRelevanceScore: Number(minScore),
      filterByOrganization: filterOrg ? [filterOrg] : undefined,
      filterByCategory: filterCategory ? [filterCategory] : undefined
    });

    res.status(200).json({
      success: true,
      query: {
        raw: ragResult.query.rawQuery,
        normalized: ragResult.query.normalizedQuery,
        intent: ragResult.query.intent,
        extractedTerms: ragResult.query.medicalTerms,
        expandedKeywords: ragResult.query.expandedKeywords
      },
      hasSufficientContext: ragResult.hasSufficientContext,
      relevanceThresholdUsed: ragResult.relevanceThresholdUsed,
      latencyMs: ragResult.latencyMs,
      citations: ragResult.citations,
      chunks: ragResult.retrievedChunks.map((sc) => ({
        id: sc.chunk.id,
        documentIdentifier: sc.chunk.documentIdentifier,
        sourceTitle: sc.chunk.sourceTitle,
        organization: sc.chunk.organization,
        sectionTitle: sc.chunk.sectionTitle,
        clinicalDomain: sc.chunk.clinicalDomain,
        url: sc.chunk.url,
        score: sc.score,
        denseSimilarity: sc.denseSimilarity,
        lexicalSimilarity: sc.lexicalSimilarity,
        matchedKeywords: sc.matchedKeywords,
        meetsThreshold: sc.meetsThreshold,
        excerpt: sc.chunk.content
      }))
    });
  } catch (error: any) {
    console.error('[RAG Retrieve Route Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 14. RAG Subsystem: Dynamic Knowledge Source Management (Add Source)
 * POST /api/ai/rag/sources
 */
aiRouter.post('/rag/sources', (req: Request, res: Response): void => {
  try {
    const { id, title, organization, url, documentIdentifier, publicationDate, category, evidenceLevel, summary, content } = req.body;
    if (!id || !title || !organization || !content) {
      res.status(400).json({ success: false, error: 'Missing required fields: id, title, organization, and content are mandatory.' });
      return;
    }

    const newSource = {
      id,
      title,
      organization,
      url: url || 'https://medlineplus.gov/',
      documentIdentifier: documentIdentifier || `USER-DOC-${Date.now()}`,
      publicationDate: publicationDate || new Date().toISOString().split('T')[0],
      category: category || 'Custom Medical Guideline',
      evidenceLevel: evidenceLevel || 'User Registered Guideline',
      summary: summary || title,
      chunks: [
        {
          id: `${id}_chk_1`,
          sourceId: id,
          documentIdentifier: documentIdentifier || `USER-DOC-${Date.now()}`,
          sourceTitle: title,
          organization,
          url: url || 'https://medlineplus.gov/',
          publicationDate: publicationDate || new Date().toISOString().split('T')[0],
          sectionTitle: title,
          content: content.trim(),
          tokenCount: Math.ceil(content.length / 4),
          keywords: [title.toLowerCase()],
          clinicalDomain: category || 'General',
          embedding: []
        }
      ]
    };

    knowledgeRegistry.registerSource(newSource);
    res.status(201).json({ success: true, message: `Knowledge source '${id}' registered successfully.`, stats: knowledgeRegistry.getStats() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 15. RAG Subsystem: Dynamic Knowledge Source Removal
 * DELETE /api/ai/rag/sources/:id
 */
aiRouter.delete('/rag/sources/:id', (req: Request, res: Response): void => {
  try {
    const sourceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const removed = knowledgeRegistry.unregisterSource(sourceId);
    if (!removed) {
      res.status(404).json({ success: false, error: `Source '${sourceId}' not found.` });
      return;
    }
    res.status(200).json({ success: true, message: `Knowledge source '${sourceId}' removed.`, stats: knowledgeRegistry.getStats() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 16. RAG Subsystem: Run Retrieval Quality Benchmark / Evaluation
 * GET /api/ai/rag/evaluate
 */
aiRouter.get('/rag/evaluate', async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await runRagEvaluation();
    res.status(200).json({
      success: true,
      summary
    });
  } catch (error: any) {
    console.error('[RAG Evaluation Route Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

