import {
  AnalysisResult,
  VisualSymptomResult,
  MedicationAnalysisResult,
  DoctorLetter,
  Vaccine,
  BodyScanResult,
  ChatMessage
} from '../types';

// Audio Helper for raw PCM decoding if server returns raw audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const byteLength = data.length - (data.length % 2);
  const safeData = new Uint8Array(data.buffer, 0, byteLength);
  const dataInt16 = new Int16Array(safeData.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Secure Client API Layer.
 * All AI and secret management is routed through server-side endpoints (/api/ai/*).
 * Zero secret keys are bundled into the browser bundle.
 */
export const GeminiService = {
  /**
   * Health Assistant Chat with RAG Grounding & Clinical Safety Triage
   */
  sendChatMessage: async (
    query: string,
    language: string,
    history: ChatMessage[] = []
  ): Promise<any> => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, language, history })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Chat failed with status ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Analyzes a medical report (image/PDF)
   */
  analyzeReport: async (
    fileBase64: string,
    mimeType: string,
    targetLanguage: string,
    currentMeds: string,
    location: string
  ): Promise<AnalysisResult> => {
    const res = await fetch('/api/ai/analyze-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64,
        mimeType,
        language: targetLanguage,
        currentMeds,
        location
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Report analysis failed on the server.');
    }

    const json = await res.json();
    return json.data as AnalysisResult;
  },

  /**
   * Generates a Doctor Letter based on analysis
   */
  generateDoctorLetter: async (
    analysis: AnalysisResult,
    patientName: string,
    language: string
  ): Promise<DoctorLetter> => {
    const res = await fetch('/api/ai/doctor-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, patientName, language })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate physician letter.');
    }

    const json = await res.json();
    return json.data as DoctorLetter;
  },

  /**
   * Emergency Symptom Checker - Takes audio or text, returns advice
   */
  getEmergencyAdvice: async (
    inputData: string,
    inputType: 'text' | 'audio',
    language: string
  ): Promise<string> => {
    const res = await fetch('/api/ai/emergency-triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputData, inputType, language })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return err.advice || 'If you are experiencing severe symptoms, please dial 911 or your local emergency services immediately.';
    }

    const json = await res.json();
    return json.advice || 'Please seek immediate medical care if you feel unsafe.';
  },

  /**
   * Visual Symptom Checker
   */
  analyzeVisualSymptom: async (
    base64Image: string,
    language: string
  ): Promise<VisualSymptomResult> => {
    const res = await fetch('/api/ai/symptom-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, language, mimeType: 'image/jpeg' })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to analyze visual symptom.');
    }

    const json = await res.json();
    return json.data as VisualSymptomResult;
  },

  /**
   * Analyze Medication Label
   */
  analyzeMedication: async (
    base64Image: string,
    language: string
  ): Promise<MedicationAnalysisResult> => {
    const res = await fetch('/api/ai/medication-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, language, mimeType: 'image/jpeg' })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to analyze medication packaging.');
    }

    const json = await res.json();
    return json.data as MedicationAnalysisResult;
  },

  /**
   * Analyze Vaccine Card
   */
  analyzeVaccines: async (
    base64Image: string,
    language: string
  ): Promise<Vaccine[]> => {
    const res = await fetch('/api/ai/vaccines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, language, mimeType: 'image/jpeg' })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to read vaccine card.');
    }

    const json = await res.json();
    return json.vaccines as Vaccine[];
  },

  /**
   * Analyzes a body scan image
   */
  analyzeBodyScan: async (
    base64Image: string,
    language: string
  ): Promise<BodyScanResult> => {
    const res = await fetch('/api/ai/body-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, language, mimeType: 'image/jpeg' })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to analyze body scan image.');
    }

    const json = await res.json();
    return json.data as BodyScanResult;
  },

  /**
   * Text-to-Speech with graceful native fallback
   */
  speakText: async (text: string, language: string): Promise<void> => {
    try {
      // First try server-side TTS
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.audioBase64) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass({ sampleRate: json.sampleRate || 24000 });
          const bytes = decode(json.audioBase64);
          const audioBuffer = await decodeAudioData(bytes, audioCtx, json.sampleRate || 24000, 1);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);
          source.start();
          return;
        }
      }
    } catch (err) {
      console.warn('[Gemini TTS] Server TTS failed, falling back to Web Speech API:', err);
    }

    // Graceful browser fallback using Web Speech Synthesis API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
};
