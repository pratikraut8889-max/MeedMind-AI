import React, { useState } from 'react';
import { Button, Card, Badge } from './SharedComponents';

interface WellnessCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: { score: number; energy: string; symptoms: string[]; notes: string }) => void;
  darkMode: boolean;
  highContrast: boolean;
}

export const WellnessCheckinModal: React.FC<WellnessCheckinModalProps> = ({
  isOpen,
  onClose,
  onSave,
  darkMode,
  highContrast
}) => {
  const [score, setScore] = useState<number>(4);
  const [energy, setEnergy] = useState<string>('Moderate');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const scoreOptions = [
    { value: 1, label: 'Poor / Severe Distress', icon: 'fas fa-face-frown-open', color: 'text-rose-500 border-rose-300' },
    { value: 2, label: 'Mild Discomfort', icon: 'fas fa-face-frown', color: 'text-amber-500 border-amber-300' },
    { value: 3, label: 'Neutral / Fair', icon: 'fas fa-face-meh', color: 'text-slate-500 border-slate-300' },
    { value: 4, label: 'Good / Stable', icon: 'fas fa-face-smile', color: 'text-emerald-500 border-emerald-300' },
    { value: 5, label: 'Optimal / Energetic', icon: 'fas fa-face-laugh-beam', color: 'text-blue-500 border-blue-300' }
  ];

  const commonSymptoms = [
    'Fatigue',
    'Headache',
    'Joint / Muscle Pain',
    'Nausea / GI Upset',
    'Mild Cough',
    'Sleep Disruption',
    'Dizziness'
  ];

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleSave = () => {
    onSave({
      score,
      energy,
      symptoms: selectedSymptoms,
      notes: notes.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card
        className="w-full max-w-lg relative space-y-5"
        darkMode={darkMode}
        highContrast={highContrast}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <div>
              <h2 className="text-base font-bold">Daily Patient Wellness Check-in</h2>
              <p className="text-[11px] text-slate-500">Record baseline subjective vitality and symptoms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Vitality Score */}
        <div>
          <label className="text-xs font-bold block mb-2">Overall Wellness & Symptom Burden</label>
          <div className="grid grid-cols-5 gap-2">
            {scoreOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScore(opt.value)}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  score === opt.value
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <i className={`${opt.icon} text-xl ${opt.color}`}></i>
                <span className="text-[10px] font-bold block">{opt.value}/5</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 text-center">
            {scoreOptions.find((o) => o.value === score)?.label}
          </p>
        </div>

        {/* Energy Level */}
        <div>
          <label className="text-xs font-bold block mb-2">Energy & Cognitive Stamina</label>
          <div className="grid grid-cols-3 gap-2">
            {['Low / Fatigued', 'Moderate / Normal', 'High / Vital'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setEnergy(lvl.split(' ')[0])}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                  energy === lvl.split(' ')[0]
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Symptoms checklist */}
        <div>
          <label className="text-xs font-bold block mb-2">Active Discomforts / Symptoms</label>
          <div className="flex flex-wrap gap-1.5">
            {commonSymptoms.map((sym) => {
              const selected = selectedSymptoms.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleSymptom(sym)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {sym} {selected && <i className="fas fa-check ml-1 text-[10px]"></i>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold block mb-1">Clinical Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Slept 7 hours, mild tension headache after screen time..."
            rows={2}
            className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} className="flex-1">
            Log Wellness Check-in
          </Button>
        </div>
      </Card>
    </div>
  );
};
