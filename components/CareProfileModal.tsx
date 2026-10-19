import React, { useState, useEffect } from 'react';
import { CareProfile } from '../types';

interface CareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CareProfile | null;
  onSave: (profile: CareProfile) => Promise<void>;
  darkMode: boolean;
  highContrast: boolean;
}

export const DEMO_CARE_PROFILE: CareProfile = {
  name: 'Eleanor Vance',
  relationship: 'Grandmother',
  ageRange: '74 years old',
  healthGoals: 'Maintain systolic blood pressure < 130 mmHg, improve joint mobility, and prevent dehydration.',
  knownConditions: 'Primary Hypertension, Bilateral Knee Osteoarthritis, Mild GERD',
  allergies: 'Penicillin (hives / cutaneous rash), Sulfa antibiotics',
  currentMedications: 'Lisinopril 10mg daily, Omeprazole 20mg PRN, Vitamin D3 1000 IU daily',
  preferredLanguage: 'English',
  careNotes: 'Prefers clear, plain-language summaries without dense clinical jargon. Needs reminders for afternoon water intake.',
  updatedAt: Date.now()
};

export const CareProfileModal: React.FC<CareProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  darkMode,
  highContrast
}) => {
  const [form, setForm] = useState<CareProfile>({
    name: '',
    relationship: 'Family Member',
    ageRange: '',
    healthGoals: '',
    knownConditions: '',
    allergies: '',
    currentMedications: '',
    preferredLanguage: 'English',
    careNotes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm(profile);
    } else {
      setForm({
        name: '',
        relationship: 'Family Member',
        ageRange: '',
        healthGoals: '',
        knownConditions: '',
        allergies: '',
        currentMedications: '',
        preferredLanguage: 'English',
        careNotes: ''
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleLoadDemo = () => {
    setForm(DEMO_CARE_PROFILE);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        relationship: form.relationship.trim(),
        updatedAt: Date.now()
      });
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save care profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const RELATIONSHIPS = [
    'Mother',
    'Father',
    'Grandmother',
    'Grandfather',
    'Spouse / Partner',
    'Daughter',
    'Son',
    'Sister',
    'Brother',
    'Close Friend',
    'Caregiver Patient',
    'Myself'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border my-6 ${
          highContrast
            ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
            : darkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center text-lg shadow-md shadow-rose-500/20 shrink-0">
              <i className="fas fa-heart"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg sm:text-xl">Care Profile</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                  Build for a Friend
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Who are you building MediMind for? Give MediMind enough context to make health information easier to understand.
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

        {/* Hacktoberfest Demo Quick Preset Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <i className="fas fa-sparkles text-rose-500 text-sm"></i>
            <div>
              <p className="font-bold text-rose-950 dark:text-rose-200">
                Hacktoberfest Demo Preset
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Load sample fictional profile (Eleanor, 74 • Hypertension & Osteoarthritis) for immediate demonstration.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="load-demo-profile-btn"
            onClick={handleLoadDemo}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] hover:bg-rose-100 dark:hover:bg-slate-700 transition shrink-0 shadow-sm"
          >
            Load Eleanor Preset
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Identity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Person's Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="care-profile-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Eleanor, Mom, Arthur"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Relationship
              </label>
              <select
                id="care-profile-relationship"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel} className="bg-white text-slate-900">
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Age or Age Range
              </label>
              <input
                type="text"
                id="care-profile-age"
                value={form.ageRange || ''}
                onChange={(e) => setForm({ ...form, ageRange: e.target.value })}
                placeholder="e.g. 74 or Senior (65+)"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Health Goals */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Relevant Health Goals
            </label>
            <input
              type="text"
              id="care-profile-goals"
              value={form.healthGoals || ''}
              onChange={(e) => setForm({ ...form, healthGoals: e.target.value })}
              placeholder="e.g. Keep blood pressure < 130/80, maintain daily walking, monitor kidney function"
              className={`w-full px-3 py-2 rounded-xl border outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Clinical Profile Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Known Conditions
              </label>
              <textarea
                rows={2}
                id="care-profile-conditions"
                value={form.knownConditions || ''}
                onChange={(e) => setForm({ ...form, knownConditions: e.target.value })}
                placeholder="e.g. Primary Hypertension, Osteoarthritis, Type 2 Diabetes"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Allergies & Sensitivities
              </label>
              <textarea
                rows={2}
                id="care-profile-allergies"
                value={form.allergies || ''}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                placeholder="e.g. Penicillin (rash), Sulfa, NSAIDs (stomach irritation)"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Current Medications
              </label>
              <input
                type="text"
                id="care-profile-meds"
                value={form.currentMedications || ''}
                onChange={(e) => setForm({ ...form, currentMedications: e.target.value })}
                placeholder="e.g. Lisinopril 10mg, Amlodipine 5mg"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preferred Language
              </label>
              <input
                type="text"
                id="care-profile-language"
                value={form.preferredLanguage || 'English'}
                onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                placeholder="e.g. English, Spanish, Mandarin"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Care Notes */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Care Notes & Communication Preferences
            </label>
            <textarea
              rows={2}
              id="care-profile-notes"
              value={form.careNotes || ''}
              onChange={(e) => setForm({ ...form, careNotes: e.target.value })}
              placeholder="e.g. Prefers plain-English explanations. Keep paragraphs short and actionable. Remind about taking medications with morning oatmeal."
              className={`w-full px-3 py-2 rounded-xl border outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
            <i className="fas fa-lock text-emerald-500 mt-0.5 shrink-0"></i>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Private & Secure Decision Support
              </p>
              <p className="mt-0.5">
                This care profile is stored under your authenticated account and used solely to personalize medical explanations and drug interaction warnings. MediMind is an educational and clinical decision-support tool, not a replacement for a licensed healthcare provider.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-care-profile-btn"
              disabled={isSaving || !form.name.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-rose-600/20"
            >
              <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : successToast ? 'fa-check' : 'fa-heart'}`}></i>
              <span>{isSaving ? 'Saving Profile...' : successToast ? 'Saved!' : 'Save Care Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
