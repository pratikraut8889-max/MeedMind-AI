import { Router, Request, Response } from 'express';
import { Modality, Type } from '@google/genai';
import { getGeminiClient, AI_MODELS } from '../ai/geminiClient';
import { retrieveMedicalKnowledge } from '../ai/rag/knowledgeSources';
import { evaluateClinicalSafety, STANDARD_MEDICAL_DISCLAIMER } from '../ai/safety/medicalTriage';
import { sanitizeUserInput } from '../ai/safety/sanitizer';
import {
  medicalReportSchema,
  chatResponseSchema,
  visualSymptomSchema,
  doctorLetterSchema,
  medicationAnalysisSchema
} from '../ai/schemas/aiSchemas';
import { validateBase64Upload } from '../middleware/fileUploadValidator';
import { createRateLimiter } from '../middleware/rateLimiter';
import { BASE_MEDICAL_SYSTEM_INSTRUCTION, buildChatPrompt, buildReportAnalysisPrompt } from '../ai/prompts/medicalPrompts';

export const aiRouter = Router();

// Dedicated rate limits: AI chat allows 30 req/min, heavy file analysis allows 15 req/min
const chatLimiter = createRateLimiter({ windowMs: 60000, max: 30, message: 'Chat rate limit reached. Please wait a moment.' });
const uploadLimiter = createRateLimiter({ windowMs: 60000, max: 15, message: 'Analysis rate limit reached. Please wait a moment before uploading more documents.' });

/**
 * 1. AI Health Assistant Chat (RAG Grounded + Clinical Safety)
 * POST /api/ai/chat
 */
aiRouter.post('/chat', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, language = 'English', history = [] } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'A non-empty text query is required.' });
      return;
    }

    const { cleanText } = sanitizeUserInput(query, 3000);

    // 1. Clinical safety check (pre-LLM deterministic triage)
    const safetyCheck = evaluateClinicalSafety(cleanText);

    // 2. RAG Knowledge retrieval
    const ragResult = retrieveMedicalKnowledge(cleanText, 3);

    // 3. Construct prompt
    const historySnippet = Array.isArray(history)
      ? history.slice(-4).map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${sanitizeUserInput(m.content || '', 500).cleanText}`).join('\n')
      : '';

    const prompt = buildChatPrompt({
      userQuery: cleanText,
      targetLanguage: language,
      ragContext: ragResult.contextString,
      conversationHistorySnippet: historySnippet
    });

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: chatResponseSchema,
        temperature: 0.2 // Low temperature for high medical accuracy
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from AI engine');
    }

    const parsed = JSON.parse(responseText);

    // If deterministic safety triage detected an emergency, override urgency
    if (safetyCheck.emergencyActionRequired) {
      parsed.urgency = 'emergency';
      parsed.emergencyActionRequired = true;
      if (safetyCheck.immediateInstructions) {
        parsed.summary = `${safetyCheck.immediateInstructions}\n\n${parsed.summary}`;
      }
      if (safetyCheck.detectedEmergencyFlags.length > 0) {
        parsed.redFlags = Array.from(new Set([...(parsed.redFlags || []), ...safetyCheck.detectedEmergencyFlags]));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        sources: ragResult.citations,
        disclaimer: parsed.disclaimer || STANDARD_MEDICAL_DISCLAIMER
      }
    });
  } catch (error: any) {
    console.error('[AI Chat Error]', error?.message || error);
    res.status(500).json({
      error: 'AI_SERVICE_ERROR',
      message: 'Unable to process health consultation at this time. If this is an emergency, contact local emergency services immediately.'
    });
  }
});

/**
 * 2. Medical Report Analyzer (Image/PDF)
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

    const cleanMeds = sanitizeUserInput(currentMeds || '', 500).cleanText;
    const cleanLocation = sanitizeUserInput(location || '', 100).cleanText;

    // RAG retrieval for relevant lab panels (CBC, kidney, liver, blood glucose, etc.)
    const ragResult = retrieveMedicalKnowledge(`${cleanMeds} ${validation.mimeType} lab results complete blood count metabolic panel urinalysis`, 4);

    const prompt = buildReportAnalysisPrompt({
      targetLanguage: language,
      currentMeds: cleanMeds,
      location: cleanLocation,
      ragContext: ragResult.contextString
    });

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: {
        parts: [
          { inlineData: { mimeType: validation.mimeType, data: validation.cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: medicalReportSchema,
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) throw new Error('No response returned from report analyzer');

    const parsed = JSON.parse(text);

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        sources: ragResult.citations,
        disclaimer: STANDARD_MEDICAL_DISCLAIMER
      }
    });
  } catch (error: any) {
    console.error('[Analyze Report Error]', error?.message || error);
    res.status(500).json({
      error: 'ANALYSIS_ERROR',
      message: 'Failed to analyze the medical document. Ensure the file is clear, readable, and under 10MB.'
    });
  }
});

/**
 * 3. Emergency Audio / Text Triage
 * POST /api/ai/emergency-triage
 */
aiRouter.post('/emergency-triage', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputData, inputType = 'text', language = 'English' } = req.body;

    if (!inputData) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'inputData is required' });
      return;
    }

    const ai = getGeminiClient();
    let prompt = '';
    const parts: any[] = [];

    if (inputType === 'audio') {
      const validation = validateBase64Upload(inputData, 'audio/wav');
      if (!validation.valid || !validation.cleanBase64) {
        res.status(400).json({ error: 'AUDIO_VALIDATION_FAILED', message: 'Invalid audio recording' });
        return;
      }
      parts.push({ inlineData: { mimeType: 'audio/wav', data: validation.cleanBase64 } });
      prompt = `Patient speaks their urgent symptoms. Respond in ${language}. Provide rapid triage in under 80 words. If life-threatening, say CALL 911 / 112 IMMEDIATELY.`;
    } else {
      const { cleanText } = sanitizeUserInput(String(inputData), 2000);
      prompt = `Urgent Patient Symptoms: "${cleanText}". Respond in ${language}. State clearly if immediate emergency care (911/112) is needed. Keep response concise, calm, and under 100 words.`;
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: { parts },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION + '\nPrioritize patient life safety above all else. Keep answer under 100 words.',
        temperature: 0.1
      }
    });

    const reply = response.text || 'If you are in distress or having difficulty breathing, call 911 or your local emergency number immediately.';

    res.status(200).json({
      success: true,
      advice: reply,
      disclaimer: STANDARD_MEDICAL_DISCLAIMER
    });
  } catch (error: any) {
    console.error('[Emergency Triage Error]', error?.message || error);
    res.status(500).json({
      error: 'EMERGENCY_TRIAGE_ERROR',
      advice: 'If you feel unsafe or have severe chest pain, shortness of breath, or uncontrolled bleeding, please dial emergency medical services (911 / 112) immediately.'
    });
  }
});

/**
 * 4. Visual Symptom Checker (Skin, eye, wound, rash)
 * POST /api/ai/symptom-check
 */
aiRouter.post('/symptom-check', uploadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Image, mimeType = 'image/jpeg', language = 'English' } = req.body;

    const validation = validateBase64Upload(base64Image, mimeType);
    if (!validation.valid || !validation.cleanBase64 || !validation.mimeType) {
      res.status(400).json({ error: 'IMAGE_VALIDATION_FAILED', message: validation.error || 'Invalid image.' });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Analyze the visual symptom in the attached image (e.g. rash, insect bite, wound, skin lesion). Output in ${language}. Assign Urgency (GREEN: mild, YELLOW: moderate, RED: severe emergency). Include a child explanation and home observation advice.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: {
        parts: [
          { inlineData: { mimeType: validation.mimeType, data: validation.cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: visualSymptomSchema,
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) throw new Error('No response from visual symptom model');

    res.status(200).json({
      success: true,
      data: JSON.parse(text)
    });
  } catch (error: any) {
    console.error('[Visual Symptom Error]', error?.message || error);
    res.status(500).json({
      error: 'VISUAL_SYMPTOM_ERROR',
      message: 'Failed to inspect visual symptom image. Please check image clarity and try again.'
    });
  }
});

/**
 * 5. Medication Packaging Analysis
 * POST /api/ai/medication-check
 */
aiRouter.post('/medication-check', uploadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Image, mimeType = 'image/jpeg', language = 'English' } = req.body;

    const validation = validateBase64Upload(base64Image, mimeType);
    if (!validation.valid || !validation.cleanBase64 || !validation.mimeType) {
      res.status(400).json({ error: 'IMAGE_VALIDATION_FAILED', message: validation.error || 'Invalid image.' });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Inspect this prescription bottle, box, or blister pack. Extract medication name, dosage strength, frequency, instructions, and standard precautions. Output in ${language}.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: {
        parts: [
          { inlineData: { mimeType: validation.mimeType, data: validation.cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: medicationAnalysisSchema,
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) throw new Error('No response from medication analyzer');

    res.status(200).json({
      success: true,
      data: JSON.parse(text)
    });
  } catch (error: any) {
    console.error('[Medication Check Error]', error?.message || error);
    res.status(500).json({
      error: 'MEDICATION_CHECK_ERROR',
      message: 'Could not read medication packaging clearly. Please ensure label text is well-lit and in focus.'
    });
  }
});

/**
 * 6. Doctor Letter Generation
 * POST /api/ai/doctor-letter
 */
aiRouter.post('/doctor-letter', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { analysis, patientName = 'The Patient', language = 'English' } = req.body;

    if (!analysis) {
      res.status(400).json({ error: 'MISSING_ANALYSIS', message: 'Analysis data is required to draft letter.' });
      return;
    }

    const cleanName = sanitizeUserInput(patientName || 'The Patient', 100).cleanText;

    const prompt = `
Generate an objective, formal 1-page Clinical Summary Letter that patient "${cleanName}" can hand to their physician.
Language: ${language}.
Analysis Data: ${JSON.stringify(analysis).slice(0, 4000)}

Requirements:
- Professional, concise summary for the physician.
- Highlight reported findings and critical notes/red flags.
- Prepare 3-4 specific questions for the patient to ask.
- Explicitly note this is patient-initiated AI summary, not a medical certification.
`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: doctorLetterSchema,
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) throw new Error('No response from letter generator');

    res.status(200).json({
      success: true,
      data: JSON.parse(text)
    });
  } catch (error: any) {
    console.error('[Doctor Letter Error]', error?.message || error);
    res.status(500).json({
      error: 'DOCTOR_LETTER_ERROR',
      message: 'Failed to generate physician letter. Please try again.'
    });
  }
});

/**
 * 7. Vaccine Card Analysis
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

    const ai = getGeminiClient();
    const prompt = `Extract all visible immunization/vaccination records from this card. Status must be VALID, EXPIRED, or UPCOMING. Translate notes to ${language}.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: {
        parts: [
          { inlineData: { mimeType: validation.mimeType, data: validation.cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              dateGiven: { type: Type.STRING },
              nextDueDate: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['VALID', 'EXPIRED', 'UPCOMING'] },
              notes: { type: Type.STRING }
            },
            required: ['name', 'dateGiven', 'status']
          }
        },
        temperature: 0.1
      }
    });

    const raw = JSON.parse(response.text || '[]') as any[];
    const vaccines = raw.map((v, i) => ({ ...v, id: 'vac_' + Date.now() + '_' + i }));

    res.status(200).json({
      success: true,
      vaccines
    });
  } catch (error: any) {
    console.error('[Vaccine Card Error]', error?.message || error);
    res.status(500).json({
      error: 'VACCINE_ANALYSIS_ERROR',
      message: 'Failed to extract immunization records from image.'
    });
  }
});

/**
 * 8. Body Scan Analysis
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

    const ai = getGeminiClient();
    const prompt = `Analyze this body scan image. Provide health observation summary in ${language}, breakdown of observed areas with severity (NORMAL, MONITOR, ACTION_REQUIRED), and safe actionable recommendations.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: {
        parts: [
          { inlineData: { mimeType: validation.mimeType, data: validation.cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING },
                  observation: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['NORMAL', 'MONITOR', 'ACTION_REQUIRED'] }
                },
                required: ['area', 'observation', 'severity']
              }
            },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['summary', 'findings', 'recommendations', 'nextSteps']
        },
        temperature: 0.2
      }
    });

    res.status(200).json({
      success: true,
      data: JSON.parse(response.text || '{}')
    });
  } catch (error: any) {
    console.error('[Body Scan Error]', error?.message || error);
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
    console.error('[TTS Error]', error?.message || error);
    res.status(500).json({
      error: 'TTS_SERVICE_ERROR',
      message: 'Speech synthesis temporarily unavailable.'
    });
  }
});

/**
 * 10. Quick High-Level Summary Paragraph Generation for Saved Reports
 * POST /api/ai/quick-summary
 */
aiRouter.post('/quick-summary', chatLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName, summary, redFlags = [], labMeasurements = [], language = 'English' } = req.body;

    const redFlagText = Array.isArray(redFlags) && redFlags.length > 0
      ? redFlags.map((f: any) => `${f.finding} (${f.severity}): ${f.action}`).join('; ')
      : 'None detected';

    const labText = Array.isArray(labMeasurements) && labMeasurements.length > 0
      ? labMeasurements.slice(0, 5).map((l: any) => `${l.test}: ${l.value} ${l.unit} (${l.status})`).join('; ')
      : 'No structured lab measurements provided';

    const prompt = `You are a clinical document summarizer. Review the medical report findings below and generate an ultra-concise, high-level executive scan paragraph (exactly 2 to 3 sentences, 40 to 60 words).

Report Document: ${fileName || 'Medical Analysis'}
Target Language: ${language}
Full Summary: ${summary || 'Not provided'}
Red Flags: ${redFlagText}
Key Lab Markers: ${labText}

Guidelines:
- Explain what the test was and its primary conclusion.
- Note whether any red flags or abnormal markers were detected and their clinical significance.
- State whether immediate medical follow-up or routine monitoring is indicated.
- Write as a single, fluid, professional paragraph in ${language}. Do not include markdown headers or bullet points.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: BASE_MEDICAL_SYSTEM_INSTRUCTION,
        temperature: 0.2
      }
    });

    const quickSummary = response.text?.trim() || '';

    res.status(200).json({
      success: true,
      quickSummary: quickSummary || summary?.slice(0, 180) + '...'
    });
  } catch (error: any) {
    console.error('[Quick Summary Error]', error?.message || error);
    // Graceful fallback from summary if API has issues
    const fallback = req.body.summary ? `${req.body.summary.slice(0, 180)}...` : 'Executive summary currently unavailable.';
    res.status(200).json({
      success: true,
      quickSummary: fallback
    });
  }
});
