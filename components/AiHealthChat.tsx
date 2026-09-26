import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, SUPPORTED_LANGUAGES, UrgencyLevel } from '../types';
import { GeminiService } from '../services/geminiService';
import { MedicalCitationCard } from './MedicalCitationCard';

interface AiHealthChatProps {
  language: string;
  darkMode: boolean;
  highContrast: boolean;
  onBack: () => void;
}

export const AiHealthChat: React.FC<AiHealthChatProps> = ({
  language,
  darkMode,
  highContrast,
  onBack
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('medimind_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: 'Hello, I am your MediMind Health Assistant. How can I assist you with your health questions, lab findings, or medical terms today?',
        timestamp: Date.now(),
        urgency: 'information' as UrgencyLevel,
        recommendedNextSteps: [
          'Ask questions about laboratory markers, medical terms, or symptoms.',
          'Bring any unresolved concerns to your primary care physician.'
        ],
        disclaimer: 'MediMind AI provides health education only and is not a substitute for clinical diagnosis or emergency care.'
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('medimind_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    setInputQuery('');

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const historyContext = messages.slice(-6);
      const result = await GeminiService.sendChatMessage(textToSend, language, historyContext);

      const assistantMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_a',
        role: 'assistant',
        content: result.summary || 'I analyzed your query.',
        timestamp: Date.now(),
        urgency: result.urgency,
        redFlags: result.redFlags,
        possibleExplanations: result.possibleExplanations,
        recommendedNextSteps: result.recommendedNextSteps,
        questionsForDoctor: result.questionsForDoctor,
        sources: result.sources,
        disclaimer: result.disclaimer,
        emergencyActionRequired: result.emergencyActionRequired
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to reach AI service. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (msg: ChatMessage) => {
    const text = [
      msg.content,
      msg.possibleExplanations?.length ? `\nPossible Explanations:\n- ${msg.possibleExplanations.join('\n- ')}` : '',
      msg.recommendedNextSteps?.length ? `\nRecommended Next Steps:\n- ${msg.recommendedNextSteps.join('\n- ')}` : '',
      msg.questionsForDoctor?.length ? `\nQuestions for Doctor:\n- ${msg.questionsForDoctor.join('\n- ')}` : ''
    ].join('');

    navigator.clipboard.writeText(text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeechInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'Spanish' ? 'es-ES' : language === 'French' ? 'fr-FR' : 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputQuery(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Voice input error:', e);
      setIsRecording(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all conversation history?')) {
      localStorage.removeItem('medimind_chat_history');
      setMessages([
        {
          id: 'msg_' + Date.now(),
          role: 'assistant',
          content: 'Conversation history cleared. How can I assist you today?',
          timestamp: Date.now(),
          urgency: 'information',
          disclaimer: 'MediMind AI provides health education only.'
        }
      ]);
    }
  };

  const quickPrompts = [
    'Explain my Complete Blood Count (CBC) results',
    'What does high systolic blood pressure mean?',
    'Common drug interactions with blood pressure meds',
    'Red flags for persistent cough or fever'
  ];

  return (
    <div className={`h-full flex flex-col max-w-4xl mx-auto ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
      {/* Top Header */}
      <div className={`flex items-center justify-between pb-4 mb-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <button
            id="chat-back-btn"
            onClick={onBack}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">AI Health Assistant</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                RAG Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evidence-based health explanations • Non-diagnostic guidance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="clear-chat-btn"
            onClick={handleClearHistory}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              darkMode
                ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-red-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-600'
            }`}
          >
            <i className="fas fa-trash-alt mr-1"></i> Clear History
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : darkMode
                  ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
              }`}
            >
              {/* Header / Urgency Flag for Assistant */}
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                      M
                    </span>
                    <span className="text-xs font-semibold">MediMind Intelligence</span>
                  </div>

                  {msg.urgency && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        msg.urgency === 'emergency'
                          ? 'bg-red-500 text-white animate-pulse'
                          : msg.urgency === 'urgent'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {msg.urgency}
                    </span>
                  )}
                </div>
              )}

              {/* Emergency Alert Banner */}
              {msg.emergencyActionRequired && (
                <div className="mb-3 p-3 bg-red-600 text-white rounded-lg text-xs font-semibold flex items-start gap-2 shadow-md">
                  <i className="fas fa-exclamation-triangle text-base mt-0.5"></i>
                  <div>
                    <p className="font-bold">IMMEDIATE EMERGENCY ATTENTION ADVISED</p>
                    <p className="font-normal opacity-90">
                      These symptoms may require urgent medical care. Call 911, 112, or your local emergency services right away.
                    </p>
                  </div>
                </div>
              )}

              {/* Message Core Content */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

              {/* Red Flags Section */}
              {msg.redFlags && msg.redFlags.length > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs">
                  <p className="font-bold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                    <i className="fas fa-flag"></i> Red Flags to Watch:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-red-800 dark:text-red-300">
                    {msg.redFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Possible Explanations */}
              {msg.possibleExplanations && msg.possibleExplanations.length > 0 && (
                <div className="mt-3 text-xs">
                  <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Possible Explanations (Non-Diagnostic):</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                    {msg.possibleExplanations.map((exp, idx) => (
                      <li key={idx}>{exp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Next Steps */}
              {msg.recommendedNextSteps && msg.recommendedNextSteps.length > 0 && (
                <div className="mt-3 text-xs">
                  <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">Recommended Next Steps:</p>
                  <ul className="list-decimal pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                    {msg.recommendedNextSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions for Doctor */}
              {msg.questionsForDoctor && msg.questionsForDoctor.length > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs">
                  <p className="font-bold text-blue-700 dark:text-blue-300 mb-1">
                    <i className="fas fa-comment-medical mr-1"></i> Questions to Ask Your Doctor:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                    {msg.questionsForDoctor.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trusted Source Citations (Grounded Clinical RAG) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <i className="fas fa-book-medical text-blue-500"></i>
                      Verified Medical Citations ({msg.sources.length})
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Authoritative RAG Grounding
                    </span>
                  </div>
                  <div className="space-y-2">
                    {msg.sources.map((src, idx) => (
                      <MedicalCitationCard key={idx} citation={src} />
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              {msg.disclaimer && (
                <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 italic">
                  {msg.disclaimer}
                </p>
              )}

              {/* Footer controls: Time, Speak, Copy */}
              <div className="flex items-center justify-between mt-2 pt-1 text-[10px] opacity-75 border-t border-slate-100 dark:border-slate-700/50">
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => GeminiService.speakText(msg.content, language)}
                      className="hover:text-blue-500 transition-colors"
                      title="Read aloud"
                    >
                      <i className="fas fa-volume-up"></i>
                    </button>
                    <button
                      onClick={() => handleCopy(msg)}
                      className="hover:text-blue-500 transition-colors"
                      title="Copy response"
                    >
                      <i className={`fas ${copiedId === msg.id ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div
              className={`p-4 rounded-2xl rounded-bl-none shadow-sm max-w-[80%] flex items-center gap-3 ${
                darkMode ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></div>
              <span className="text-xs font-medium">Retrieving medical evidence & analyzing query...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => handleSend()}
              className="px-2 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts (Only if short chat) */}
      {messages.length <= 2 && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Suggested Questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    : 'border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query Input Box */}
      <div
        className={`p-2 rounded-2xl border flex items-center gap-2 shadow-sm ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        <button
          id="chat-mic-btn"
          onClick={handleSpeechInput}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : darkMode
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title={isRecording ? 'Listening...' : 'Speak message'}
        >
          <i className="fas fa-microphone"></i>
        </button>

        <input
          id="chat-query-input"
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Ask about symptoms, lab results, medications in ${language}...`}
          disabled={isLoading}
          className={`flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none ${
            darkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
          }`}
        />

        <button
          id="chat-send-btn"
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            inputQuery.trim() && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};
