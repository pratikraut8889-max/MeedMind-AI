import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/geminiService';
import { EmergencyContact } from '../types';
import { Button, Card, Badge } from './SharedComponents';

interface EmergencyModeViewProps {
  language: string;
  highContrast: boolean;
  darkMode: boolean;
  onBack: () => void;
  emergencyContacts?: EmergencyContact[];
}

export const EmergencyModeView: React.FC<EmergencyModeViewProps> = ({
  language,
  highContrast,
  darkMode,
  onBack,
  emergencyContacts = []
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState('');
  const [activeCallNotice, setActiveCallNotice] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startListening = async () => {
    setAudioError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          try {
            const response = await GeminiService.getEmergencyAdvice(base64Audio, 'audio', language);
            setAdvice(response);
            GeminiService.speakText(response, language);
          } catch (e) {
            setAdvice("Immediate medical attention may be needed. Call 911 or visit the nearest emergency room.");
          } finally {
            setIsProcessing(false);
          }
        };
      };

      mediaRecorder.current.start();
      setIsListening(true);
    } catch (e: any) {
      console.error("Microphone access error:", e);
      setAudioError("Microphone access was denied or not available. You can type your symptom description below.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (mediaRecorder.current && isListening) {
      mediaRecorder.current.stop();
      setIsListening(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textQuery.trim() || isProcessing) return;

    setIsProcessing(true);
    setAudioError(null);
    try {
      // Use emergency advice logic with text payload
      const response = await GeminiService.getEmergencyAdvice(textQuery.trim(), 'text', language);
      setAdvice(response);
      GeminiService.speakText(response, language);
    } catch (e) {
      setAdvice("Immediate medical attention may be needed. Call 911 or visit the nearest emergency room.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCall = (label: string, number: string) => {
    setActiveCallNotice(`Calling ${label} (${number})...`);
    window.location.href = `tel:${number}`;
    setTimeout(() => setActiveCallNotice(null), 4000);
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 animate-fade-in pb-20 ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-rose-200 dark:border-rose-900/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
            <i className="fas fa-truck-medical text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                Emergency Care & Triage
              </h1>
              <Badge tone="danger" icon="fas fa-circle-exclamation">Immediate Assistance</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rapid dispatch assistance and emergency symptom guidance
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<i className="fas fa-arrow-left"></i>}>
          Return to Dashboard
        </Button>
      </div>

      {/* Critical Disclaimer Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200 flex items-start gap-3.5">
        <i className="fas fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-xl shrink-0 mt-0.5"></i>
        <div className="flex-1 text-xs sm:text-sm">
          <p className="font-bold text-rose-700 dark:text-rose-300 mb-1">
            If you are experiencing severe chest pressure, sudden numbness, difficulty breathing, or uncontrollable bleeding:
          </p>
          <p className="leading-relaxed opacity-90">
            Do not wait for an AI response. Immediately call emergency services (911 in North America, 112 in Europe, or your local emergency dispatch).
          </p>
        </div>
      </div>

      {/* Primary Emergency Hotlines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleCall('Emergency Services', '911')}
          className="p-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold flex items-center justify-between shadow-sm transition-all text-left"
        >
          <div>
            <span className="text-[11px] uppercase tracking-wider text-rose-200 block">Emergency Dispatch</span>
            <span className="text-xl font-extrabold">Call 911 / 112</span>
          </div>
          <i className="fas fa-phone-volume text-2xl text-rose-200"></i>
        </button>

        <button
          onClick={() => handleCall('Crisis Lifeline', '988')}
          className="p-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold flex items-center justify-between border border-slate-700 shadow-sm transition-all text-left"
        >
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Mental Health & Crisis</span>
            <span className="text-xl font-extrabold">Dial 988</span>
          </div>
          <i className="fas fa-comments text-2xl text-blue-400"></i>
        </button>

        <button
          onClick={() => handleCall('Poison Control', '1-800-222-1222')}
          className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold flex items-center justify-between border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-left"
        >
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Poison Control</span>
            <span className="text-base font-extrabold">1-800-222-1222</span>
          </div>
          <i className="fas fa-flask text-2xl text-amber-500"></i>
        </button>
      </div>

      {activeCallNotice && (
        <div className="p-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs text-center font-medium">
          {activeCallNotice}
        </div>
      )}

      {/* Triage Voice / Text Assistant */}
      <Card darkMode={darkMode} highContrast={highContrast} accent={advice ? 'danger' : 'none'}>
        <div className="text-center max-w-lg mx-auto py-4">
          {!advice ? (
            <>
              <h2 className="text-xl font-bold mb-1.5">Emergency Triage Assistant</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Hold the microphone button and clearly describe what is happening, or type the urgent symptoms below.
              </p>

              {/* Voice Button */}
              <div className="flex flex-col items-center justify-center gap-4 mb-8">
                <button
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onTouchStart={startListening}
                  onTouchEnd={stopListening}
                  disabled={isProcessing}
                  className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-lg select-none cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white scale-105 ring-8 ring-rose-500/20'
                      : isProcessing
                      ? 'bg-amber-600 text-white animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  aria-label="Hold to speak emergency description"
                >
                  <i
                    className={`fas fa-microphone text-4xl ${
                      isListening ? 'animate-pulse' : ''
                    }`}
                  ></i>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isListening ? 'Listening...' : isProcessing ? 'Evaluating...' : 'Hold to Speak'}
                  </span>
                </button>
                <p className="text-xs text-slate-400">
                  {isListening ? 'Release button when done speaking' : 'Supports voice in ' + language}
                </p>
              </div>

              {audioError && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs mb-6 text-left">
                  <i className="fas fa-info-circle mr-1.5"></i>
                  {audioError}
                </div>
              )}

              {/* Text Fallback Form */}
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  placeholder="Or type urgent symptoms (e.g. sharp abdominal pain, high fever)..."
                  className={`flex-1 p-3 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700 focus:border-rose-500 text-white'
                      : 'bg-white border-slate-200 focus:border-rose-500 text-slate-900'
                  }`}
                />
                <Button
                  type="submit"
                  variant="danger"
                  disabled={!textQuery.trim() || isProcessing}
                  isLoading={isProcessing}
                  size="md"
                >
                  Evaluate
                </Button>
              </form>
            </>
          ) : (
            <div className="text-left space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
                    <i className="fas fa-stethoscope"></i>
                  </span>
                  <div>
                    <h3 className="font-bold text-base">Triage Recommendation</h3>
                    <p className="text-[11px] text-slate-500">Evaluated in {language}</p>
                  </div>
                </div>
                <button
                  onClick={() => GeminiService.speakText(advice, language)}
                  className="p-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5"
                  title="Listen to instructions"
                >
                  <i className="fas fa-volume-up text-blue-500"></i> Read Aloud
                </button>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium text-slate-800 dark:text-slate-100">
                  {advice}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="emergency"
                  onClick={() => handleCall('Emergency Services', '911')}
                  className="flex-1"
                  leftIcon={<i className="fas fa-phone-alt"></i>}
                >
                  Call 911 Now
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAdvice(null);
                    setTextQuery('');
                  }}
                  className="flex-1"
                  leftIcon={<i className="fas fa-rotate-left"></i>}
                >
                  Assess Another Condition
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Saved Emergency Contacts Glance */}
      {emergencyContacts.length > 0 && (
        <Card darkMode={darkMode} highContrast={highContrast}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <i className="fas fa-address-book text-blue-600"></i>
              <span>Patient's Registered Emergency Contacts</span>
            </h3>
            <span className="text-xs text-slate-500">{emergencyContacts.length} on file</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {emergencyContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40"
              >
                <div>
                  <p className="font-bold text-xs">{contact.name}</p>
                  <p className="text-[11px] text-slate-500">{contact.relation} • {contact.phone}</p>
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <i className="fas fa-phone text-[10px]"></i> Dial
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
