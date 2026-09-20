
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, VisualSymptomResult, MedicationAnalysisResult, DoctorLetter, Vaccine, BodyScanResult } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Audio Helper for raw PCM decoding
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
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure data length is even for Int16Array
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

export const GeminiService = {
  /**
   * Analyzes a medical report (image/PDF) using Gemini 3 Pro Preview
   */
  analyzeReport: async (
    fileBase64: string,
    mimeType: string,
    targetLanguage: string,
    currentMeds: string,
    location: string
  ): Promise<AnalysisResult> => {
    
    const systemInstruction = `
      You are MediMind, a compassionate, world-class medical AI assistant. 
      Your goal is to explain medical documents to patients in simple, easy-to-understand language.
      
      CRITICAL RULES:
      1. Translate EVERYTHING into ${targetLanguage}.
      2. Be empathetic but accurate.
      3. Identify "Red Flags" - findings that require immediate or urgent doctor attention.
      4. Check for interactions if the user provided current medications: "${currentMeds}".
      5. If a location is provided ("${location}"), estimate the cost range for recommended tests/medicines in that local currency/context.
      6. Provide a "Child Explanation" using fun analogies (e.g. "White blood cells are like tiny soldiers").
      7. Format output strictly as JSON.
    `;

    const prompt = `
      Analyze this attached medical document. 
      Provide a patient-friendly summary.
      List any urgent red flags.
      Check for medication interactions if applicable.
      List 3 clear next steps for the patient.
      Provide cost estimates for ${location || 'general context'}.
      Provide a child-friendly version.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType, data: fileBase64 } },
            { text: prompt }
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A 2-sentence empathetic summary." },
              simpleExplanation: { type: Type.STRING, description: "Detailed simple language explanation of the findings." },
              childExplanation: { type: Type.STRING, description: "Explanation using simple analogies for a 5-year old." },
              estimatedCost: { type: Type.STRING, description: "Estimated cost range for treatments/tests in the user's location." },
              redFlags: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    finding: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
                    action: { type: Type.STRING }
                  }
                }
              },
              medicationInteractions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    medication: { type: Type.STRING },
                    interaction: { type: Type.STRING }
                  }
                }
              },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              language: { type: Type.STRING }
            },
            required: ['summary', 'simpleExplanation', 'childExplanation', 'estimatedCost', 'redFlags', 'nextSteps', 'language']
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      return JSON.parse(text) as AnalysisResult;

    } catch (error) {
      console.error("Analysis Error:", error);
      throw error;
    }
  },

  /**
   * Generates a Doctor Letter based on analysis
   */
  generateDoctorLetter: async (
    analysis: AnalysisResult,
    patientName: string,
    language: string
  ): Promise<DoctorLetter> => {
    const systemInstruction = `
      You are a professional medical advocate. 
      Draft a formal, concise 1-page summary letter that a patient can hand to their doctor to facilitate communication.
      Use ${language}.
      The tone should be professional, respectful, and objective.
      
      Return strictly JSON.
    `;

    const prompt = `
      Patient Name: ${patientName || 'The Patient'}
      Based on the following analysis: ${JSON.stringify(analysis)}

      Create a letter structure with:
      1. A professional summary for the doctor.
      2. Key bullet points of findings/medications.
      3. Critical notes (Red flags).
      4. 3-4 smart, specific questions the patient should ask the doctor.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              patientName: { type: Type.STRING },
              date: { type: Type.STRING, description: "Current date formatted locally" },
              summary: { type: Type.STRING, description: "Professional summary for the doctor" },
              findings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key clinical findings" },
              criticalNotes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Urgent issues or red flags" },
              questionsForDoctor: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Recommended questions for the patient to ask" }
            },
            required: ['patientName', 'date', 'summary', 'findings', 'questionsForDoctor']
          }
        }
      });

      return JSON.parse(response.text!) as DoctorLetter;
    } catch (e) {
      console.error("Doctor Letter Gen Failed", e);
      throw e;
    }
  },

  /**
   * Emergency Symptom Checker - Takes audio or text, returns advice
   */
  getEmergencyAdvice: async (
    inputData: string, // text or base64 audio
    inputType: 'text' | 'audio',
    language: string
  ): Promise<string> => {
    
    const systemInstruction = `
      You are MediMind's Emergency Triage Assistant. 
      The user is reporting symptoms. 
      Respond in ${language}.
      Assess urgency immediately.
      If it sounds life-threatening (heart attack, stroke, difficulty breathing), tell them to call emergency services immediately (911/112/etc).
      Keep the response short, clear, and calm (under 100 words).
    `;

    const parts = [];
    if (inputType === 'audio') {
      parts.push({ inlineData: { mimeType: 'audio/wav', data: inputData } });
      parts.push({ text: "Listen to my symptoms and tell me what to do." });
    } else {
      parts.push({ text: `My symptoms are: ${inputData}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.3 // Low temperature for consistent safety advice
      }
    });

    return response.text || "I could not understand. Please call emergency services if you feel unsafe.";
  },

  /**
   * Visual Symptom Checker
   */
  analyzeVisualSymptom: async (
    base64Image: string,
    language: string
  ): Promise<VisualSymptomResult> => {
    const systemInstruction = `
      You are MediMind. Analyze the visual symptom shown in the image (skin rash, eye issue, wound, tongue, etc.).
      Provide a preliminary assessment in ${language}.
      
      Determine Urgency:
      - GREEN: Mild/Self-limiting (e.g., minor bruise, acne, small scratch).
      - YELLOW: Moderate (e.g., potential infection, persistent rash, fever signs).
      - RED: Severe/Emergency (e.g., deep wound, heavy bleeding, gangrene, severe allergic reaction, difficulty breathing signs).

      Also provide a "Child Explanation" suitable for a 5-year-old using friendly analogies (e.g. "Your skin is a bit angry because...").

      Return strictly JSON.
    `;

    try {
       const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Identify the condition, possible causes, urgency, and give a child-friendly explanation." }
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              urgency: { type: Type.STRING, enum: ['GREEN', 'YELLOW', 'RED'] },
              conditionName: { type: Type.STRING, description: "Short descriptive name of the visual symptom" },
              possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING, description: "Short actionable advice" },
              disclaimer: { type: Type.STRING, description: "Legal medical disclaimer stating this is AI advice only" },
              childExplanation: { type: Type.STRING, description: "Simple explanation with analogies for a child." }
            },
            required: ['urgency', 'conditionName', 'possibleCauses', 'recommendation', 'disclaimer', 'childExplanation']
          }
        }
      });
      
      return JSON.parse(response.text!) as VisualSymptomResult;
    } catch (e) {
      console.error("Visual analysis failed", e);
      throw e;
    }
  },

  /**
   * Analyze Medication Label
   */
  analyzeMedication: async (
    base64Image: string,
    language: string
  ): Promise<MedicationAnalysisResult> => {
     const systemInstruction = `
      You are an expert pharmacist assistant. Analyze the image of the medication packaging (bottle, blister pack, box).
      Extract the details and translate context to ${language}.
      
      Return strictly JSON.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Extract Name, Dosage, Frequency, and Instructions." }
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Medicine name (Brand or Generic)" },
              dosage: { type: Type.STRING, description: "Strength (e.g. 50mg, 10ml)" },
              frequency: { type: Type.STRING, description: "Recommended frequency (e.g. 'Once daily')" },
              instructions: { type: Type.STRING, description: "Short usage instructions (e.g. 'Take with food')" }
            },
            required: ['name', 'dosage', 'frequency', 'instructions']
          }
        }
      });
      
      return JSON.parse(response.text!) as MedicationAnalysisResult;
    } catch (e) {
      console.error("Medication analysis failed", e);
      throw e;
    }
  },

  /**
   * Analyze Vaccine Card
   */
  analyzeVaccines: async (
    base64Image: string,
    language: string
  ): Promise<Vaccine[]> => {
    const systemInstruction = `
      You are a medical record assistant. Analyze the image of a vaccination card or booklet.
      Extract all visible vaccination records.
      Translate notes to ${language}.
      
      Determine status:
      - VALID: Recent or lifetime.
      - EXPIRED: Needs booster/overdue (e.g. Tetanus > 10 years, Flu > 1 year).
      - UPCOMING: Scheduled future date.

      Return strictly JSON.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Extract vaccine records." }
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                dateGiven: { type: Type.STRING, description: "YYYY-MM-DD or approx date" },
                nextDueDate: { type: Type.STRING, description: "YYYY-MM-DD or null if unknown" },
                status: { type: Type.STRING, enum: ['VALID', 'EXPIRED', 'UPCOMING'] },
                notes: { type: Type.STRING }
              }
            }
          }
        }
      });
      
      const raw = JSON.parse(response.text!) as any[];
      return raw.map((v, i) => ({ ...v, id: Date.now().toString() + i }));
    } catch (e) {
      console.error("Vaccine analysis failed", e);
      throw e;
    }
  },

  /**
   * Analyzes a body scan image
   */
  analyzeBodyScan: async (
    base64Image: string,
    language: string
  ): Promise<BodyScanResult> => {
    const systemInstruction = `
      You are MediMind's Body Scan Assistant. 
      Analyze the provided image of a person's body part or a general scan.
      Provide a comprehensive health report in ${language}.
      
      Identify:
      - Visible findings (posture, skin, swelling, etc.)
      - Severity for each finding: NORMAL, MONITOR, or ACTION_REQUIRED.
      - Actionable recommendations.
      
      Return strictly JSON.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Perform a body scan and provide a report." }
          ]
        },
        config: {
          systemInstruction: systemInstruction,
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
                  }
                }
              },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['summary', 'findings', 'recommendations', 'nextSteps']
          }
        }
      });
      
      return JSON.parse(response.text!) as BodyScanResult;
    } catch (e) {
      console.error("Body scan analysis failed", e);
      throw e;
    }
  },

  /**
   * Text-to-Speech Generation with Raw PCM Decoding
   */
  speakText: async (text: string, language: string): Promise<void> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const decodedBytes = decode(base64Audio);
      
      const audioBuffer = await decodeAudioData(
        decodedBytes,
        audioContext,
        24000,
        1
      );

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

    } catch (e) {
      console.error("TTS Error", e);
    }
  }
};
