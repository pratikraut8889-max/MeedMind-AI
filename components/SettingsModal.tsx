import React from 'react';
import { SUPPORTED_LANGUAGES } from '../types';
import { Button, Card, Badge } from './SharedComponents';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  dyslexicFont: boolean;
  setDyslexicFont: (val: boolean) => void;
  fontSize: 'normal' | 'large' | 'huge';
  setFontSize: (val: 'normal' | 'large' | 'huge') => void;
  location: string;
  setLocation: (loc: string) => void;
  autoDetectEmergency?: boolean;
  setAutoDetectEmergency?: (val: boolean) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  setLanguage,
  darkMode,
  setDarkMode,
  highContrast,
  setHighContrast,
  dyslexicFont,
  setDyslexicFont,
  fontSize,
  setFontSize,
  location,
  setLocation,
  autoDetectEmergency = true,
  setAutoDetectEmergency,
  userEmail,
  onSignOut
}) => {
  if (!isOpen) return null;

  const locationsList = [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'India',
    'Germany',
    'France',
    'Spain',
    'Japan',
    'Brazil',
    'Other'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-6 ${
          highContrast
            ? 'bg-slate-950 border-2 border-yellow-400 text-yellow-300'
            : darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base">
              <i className="fas fa-sliders"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Preferences & Accessibility</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize clinical display, typography, and regional healthcare contexts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close settings"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Section 1: Accessibility & Visual Hierarchy */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Display & Visual Comfort
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dark Mode */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs block">Dark Mode</span>
                <span className="text-[11px] text-slate-500 block">Reduces screen fatigue</span>
              </div>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            {/* High Contrast */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs block">WCAG High Contrast</span>
                <span className="text-[11px] text-slate-500 block">High-visibility yellow/black</span>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-5 h-5 rounded accent-yellow-400 cursor-pointer"
              />
            </div>

            {/* Dyslexic Font */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs block">Dyslexia-Friendly Type</span>
                <span className="text-[11px] text-slate-500 block">Weighted bottom glyphs</span>
              </div>
              <input
                type="checkbox"
                checked={dyslexicFont}
                onChange={(e) => setDyslexicFont(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Font Sizing */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs block">Typography Scale</span>
                <span className="text-[11px] text-slate-500 block">Readability sizing</span>
              </div>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as any)}
                className={`p-1.5 rounded-lg border text-xs font-semibold outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="normal">Standard (16px)</option>
                <option value="large">Large (18px)</option>
                <option value="huge">Extra Large (20px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Language & Regional Context */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Language & Healthcare System Context
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1.5">Consultation Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1.5">Regional Healthcare Billing Context</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {locationsList.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Safety & Emergency Automation */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Safety Guardrails
          </h3>

          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="max-w-md">
              <span className="font-bold text-xs block">Automated Red-Flag Escalation</span>
              <span className="text-[11px] text-slate-500 block">
                Prompts emergency helpline options when critical biomarker or symptom thresholds are breached.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoDetectEmergency}
              onChange={(e) => setAutoDetectEmergency && setAutoDetectEmergency(e.target.checked)}
              className="w-5 h-5 rounded accent-rose-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Section 4: Account & Cloud Storage */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Account & Persistence
            </h3>
            {userEmail ? (
              <Badge tone="success" icon="fas fa-cloud">Synced</Badge>
            ) : (
              <Badge tone="neutral">Local Storage</Badge>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <span className="text-xs font-bold block truncate">
                {userEmail ? userEmail : 'Guest Patient Profile'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {userEmail
                  ? 'Reports, vitals, and medications are synchronized securely with your account.'
                  : 'Data is stored locally in your browser storage. Connect Firebase account for cloud sync.'}
              </span>
            </div>
            {userEmail && onSignOut && (
              <Button variant="outline" size="sm" onClick={onSignOut}>
                Sign Out
              </Button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
