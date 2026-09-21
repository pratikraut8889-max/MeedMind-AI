import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn('[Gemini Client] Warning: Neither GEMINI_API_KEY nor API_KEY is set in environment variables. AI operations will fail until provided.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

export const AI_MODELS = {
  GENERAL: 'gemini-3.8-flash',
  TTS: 'gemini-3.1-flash-tts-preview',
} as const;
