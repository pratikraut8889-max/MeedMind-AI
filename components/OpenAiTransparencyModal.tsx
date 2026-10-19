import React, { useState, useEffect } from 'react';
import { AiEngineStatus } from '../types';
import { GeminiService } from '../services/geminiService';

interface OpenAiTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  highContrast: boolean;
}

export const OpenAiTransparencyModal: React.FC<OpenAiTransparencyModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  highContrast
}) => {
  const [status, setStatus] = useState<AiEngineStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      GeminiService.getAiStatus()
        .then((s) => {
          setStatus(s);
          setLoading(false);
        })
        .catch(() => {
          setStatus({
            provider: 'Open-Weight Inference Layer',
            model: 'gemma2-9b-it',
            openModel: true,
            ragEnabled: true,
            safetyLayerEnabled: true,
            embeddingModel: 'bge-small-en-v1.5',
            preferredFamily: 'Gemma'
          });
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div
        className={`w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border my-6 ${
          highContrast
            ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
            : darkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-500/20 shrink-0">
              <i className="fas fa-brain"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">AI Engine Transparency</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  Open-Weight Architecture
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                MediMind Hacktoberfest 2026 Core: Provider-Agnostic Open AI & Verified RAG
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Current Architecture Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Card 1: AI Engine */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              <span>AI Engine</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">
              Open-weight Model
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Provider-agnostic inference layer with zero proprietary lock-in.
            </p>
          </div>

          {/* Card 2: Model Name */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              <span>Configured Model</span>
              <span className="text-purple-500 font-mono font-bold text-[10px]">Gemma 2 Family</span>
            </div>
            <p className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 truncate">
              {status?.model || 'gemma2-9b-it'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Open-weight instruction-tuned foundation model.
            </p>
          </div>

          {/* Card 3: RAG Retrieval */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              <span>Retrieval Subsystem</span>
              <span className="text-blue-500 font-bold text-[10px]">RAG Grounded</span>
            </div>
            <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
              Open Embedding + MediMind RAG
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Model: <code className="font-mono text-[10px]">{status?.embeddingModel || 'bge-small-en-v1.5'}</code> with deterministic semantic vector fallback.
            </p>
          </div>

          {/* Card 4: Safety & Triage */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              <span>Safety & Triage Layer</span>
              <span className="text-emerald-500 font-bold text-[10px]">Deterministic</span>
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">
              Rules-First Safety Interceptor
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              911 emergency classification, PII redaction, rate limiting & citation auditing.
            </p>
          </div>
        </div>

        {/* Why Open AI Matters Section */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-blue-500/10 border border-emerald-500/20 space-y-2.5">
          <div className="flex items-center gap-2">
            <i className="fas fa-lightbulb text-emerald-500 text-sm"></i>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Why Open-Source & Open-Weight AI Matters
            </h4>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-emerald-500 text-[10px] mt-1 shrink-0"></i>
              <span><strong>Swappable Without Code Changes:</strong> Switch between Gemma, Llama, Mistral, or custom weights simply by setting environment variables.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-emerald-500 text-[10px] mt-1 shrink-0"></i>
              <span><strong>Self-Hostable & Provider-Independent:</strong> Run on local Ollama, vLLM, private hospital clouds, or open endpoints like Groq and Together.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-emerald-500 text-[10px] mt-1 shrink-0"></i>
              <span><strong>Patient Health Data Control:</strong> Keep sensitive clinical records on sovereign infrastructure without training commercial black-box models.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-emerald-500 text-[10px] mt-1 shrink-0"></i>
              <span><strong>Transparent & Auditable:</strong> Verifiable medical citations, open embedding math, and zero closed-vendor lock-in.</span>
            </li>
          </ul>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
