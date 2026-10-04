import React, { useState, useMemo } from 'react';
import { SymptomEntry } from '../types';
import { PDFExportService } from '../services/pdfExportService';
import { Button, Card, Badge, PageHeader } from './SharedComponents';

interface SymptomJournalProps {
  symptoms: SymptomEntry[];
  onAddSymptom: (symptom: Omit<SymptomEntry, 'id' | 'createdAt'>) => Promise<void> | void;
  onDeleteSymptom?: (id: string) => Promise<void> | void;
  onUpdateSymptom?: (id: string, updates: Partial<SymptomEntry>) => Promise<void> | void;
  onBack?: () => void;
  onOpenFullJournal?: () => void;
  darkMode: boolean;
  highContrast: boolean;
  isDashboardWidget?: boolean;
  patientName?: string;
}

const COMMON_SYMPTOMS = [
  'Headache',
  'Migraine',
  'Fatigue / Lethargy',
  'Fever / Chills',
  'Nausea',
  'Dizziness / Vertigo',
  'Shortness of Breath',
  'Chest Tightness',
  'Dry Cough',
  'Joint Pain',
  'Back Pain',
  'Abdominal Cramps',
  'Acid Reflux',
  'Skin Rash / Itch',
  'Sore Throat',
  'Muscle Weakness'
];

const COMMON_DURATIONS = [
  '< 30 mins',
  '1 - 2 hours',
  '3 - 6 hours',
  'Half day',
  'All day / Constant',
  'Multiple days'
];

const BODY_PARTS = [
  'Head & Neurological',
  'Chest & Respiratory',
  'Abdomen & Digestive',
  'Musculoskeletal & Limbs',
  'Skin & Dermatological',
  'Eyes / Ears / Throat',
  'General / Whole Body'
];

export const SymptomJournal: React.FC<SymptomJournalProps> = ({
  symptoms,
  onAddSymptom,
  onDeleteSymptom,
  onUpdateSymptom,
  onBack,
  onOpenFullJournal,
  darkMode,
  highContrast,
  isDashboardWidget = false,
  patientName
}) => {
  // Form state
  const [symptomName, setSymptomName] = useState('');
  const [severity, setSeverity] = useState<number>(3); // 1-10
  const [duration, setDuration] = useState('1 - 2 hours');
  const [customDuration, setCustomDuration] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [bodyPart, setBodyPart] = useState('');
  const [triggers, setTriggers] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'severe' | 'moderate' | 'mild'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Notification / Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const effectiveDuration = customDuration.trim() || duration;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symptomName.trim()) {
      showToast('Please specify a symptom name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddSymptom({
        date,
        time,
        symptom: symptomName.trim(),
        severity,
        duration: effectiveDuration,
        bodyPart: bodyPart || undefined,
        triggers: triggers.trim() || undefined,
        notes: notes.trim() || undefined
      });

      // Reset form
      setSymptomName('');
      setSeverity(3);
      setCustomDuration('');
      setDuration('1 - 2 hours');
      setTriggers('');
      setNotes('');
      setShowAddModal(false);
      showToast(`Logged symptom: ${symptomName.trim()} (Severity ${severity}/10)`);
    } catch (err) {
      console.error(err);
      showToast('Failed to record symptom. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    if (symptoms.length === 0) {
      showToast('No symptoms logged to export.');
      return;
    }
    try {
      const fileName = PDFExportService.exportSymptomJournal(symptoms, {
        patientName: patientName || 'Patient',
        reportDate: Date.now()
      });
      if (fileName) {
        showToast(`Exported Symptom Journal as ${fileName}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Could not generate PDF.');
    }
  };

  // Severity color & label helpers
  const getSeverityMeta = (val: number) => {
    if (val >= 8) {
      return {
        label: 'Severe / Debilitating',
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        barColor: 'bg-rose-500',
        textTone: 'text-rose-600 dark:text-rose-400'
      };
    }
    if (val >= 5) {
      return {
        label: 'Moderate',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        barColor: 'bg-amber-500',
        textTone: 'text-amber-600 dark:text-amber-400'
      };
    }
    return {
      label: 'Mild / Noticeable',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      barColor: 'bg-emerald-500',
      textTone: 'text-emerald-600 dark:text-emerald-400'
    };
  };

  // Filtered symptoms
  const filteredSymptoms = useMemo(() => {
    return symptoms.filter((item) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.symptom.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query);
        const matchesBody = item.bodyPart?.toLowerCase().includes(query);
        const matchesTriggers = item.triggers?.toLowerCase().includes(query);
        if (!matchesName && !matchesNotes && !matchesBody && !matchesTriggers) {
          return false;
        }
      }

      // Severity
      if (severityFilter === 'severe' && item.severity < 7) return false;
      if (severityFilter === 'moderate' && (item.severity < 4 || item.severity >= 7)) return false;
      if (severityFilter === 'mild' && item.severity >= 4) return false;

      // Date
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.date).getTime();
        const now = Date.now();
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'today' && item.date !== new Date().toISOString().split('T')[0]) return false;
        if (dateFilter === '7days' && diffDays > 7) return false;
        if (dateFilter === '30days' && diffDays > 30) return false;
      }

      return true;
    });
  }, [symptoms, searchTerm, severityFilter, dateFilter]);

  // Statistics
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todaySymptoms = symptoms.filter((s) => s.date === todayDateStr);
  const avgSeverity = symptoms.length > 0 
    ? (symptoms.reduce((acc, s) => acc + s.severity, 0) / symptoms.length).toFixed(1)
    : '0';
  const severeCount = symptoms.filter((s) => s.severity >= 7).length;

  // =========================================================================
  // RENDER: DASHBOARD WIDGET VIEW
  // =========================================================================
  if (isDashboardWidget) {
    return (
      <Card
        darkMode={darkMode}
        highContrast={highContrast}
        className="space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
            <i className="fas fa-check-circle text-emerald-400"></i>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Widget Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-base">
              <i className="fas fa-book-medical"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Daily Symptom Journal
                {todaySymptoms.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                    {todaySymptoms.length} today
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">Record episodes, pain scale & duration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon="fas fa-file-pdf"
              onClick={handleExportPDF}
              title="Export Formatted Symptom Log PDF"
            >
              Export PDF
            </Button>
            {onOpenFullJournal && (
              <Button
                variant="secondary"
                size="sm"
                icon="fas fa-arrow-right"
                onClick={onOpenFullJournal}
              >
                Full Journal
              </Button>
            )}
          </div>
        </div>

        {/* Quick Log Form inside widget */}
        <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Quick Record Symptom</span>
            <span className="text-[11px] text-slate-400 font-normal">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Symptom Input + Quick suggestions */}
          <div className="space-y-1.5">
            <div className="relative">
              <input
                type="text"
                placeholder="What symptom are you experiencing? (e.g. Throbbing Headache, Nausea)"
                value={symptomName}
                onChange={(e) => setSymptomName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-all ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-teal-500' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                }`}
              />
              {symptomName && (
                <button
                  type="button"
                  onClick={() => setSymptomName('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <span className="text-slate-400 shrink-0 text-[10px] font-semibold uppercase">Popular:</span>
              {['Headache', 'Fatigue', 'Nausea', 'Fever', 'Cough', 'Back Pain', 'Chest Tightness'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setSymptomName(sym)}
                  className={`px-2 py-0.5 rounded-lg border shrink-0 transition-colors ${
                    symptomName.toLowerCase() === sym.toLowerCase()
                      ? 'bg-teal-600 text-white border-teal-600 font-bold'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Severity & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Severity Level (1-10) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Severity: <span className="font-bold text-teal-600 dark:text-teal-400">{severity} / 10</span>
                </span>
                <span className={`text-[10px] font-bold ${getSeverityMeta(severity).textTone}`}>
                  {getSeverityMeta(severity).label}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold px-0.5">
                <span>1 (Mild)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Duration:
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={`w-full py-1.5 px-2.5 rounded-xl text-xs border outline-none ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {COMMON_DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon="fas fa-plus"
              disabled={isSubmitting || !symptomName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSubmitting ? 'Logging...' : 'Log Symptom'}
            </Button>
          </div>
        </form>

        {/* Recent 3 Logged Symptoms */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Recent Entries ({symptoms.length})</span>
            {symptoms.length > 0 && (
              <span className="text-[11px] font-normal normal-case text-slate-400">
                Avg Severity: <b className="text-slate-700 dark:text-slate-200">{avgSeverity}/10</b>
              </span>
            )}
          </div>

          {symptoms.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              <i className="fas fa-clipboard-check text-slate-300 text-lg mb-1 block"></i>
              No symptoms recorded yet. Use the form above to track how you feel.
            </div>
          ) : (
            <div className="space-y-1.5">
              {symptoms.slice(0, 3).map((item) => {
                const meta = getSeverityMeta(item.severity);
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                      darkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-teal-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${meta.badgeClass}`}>
                        {item.severity}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.symptom}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.date} {item.time ? `• ${item.time}` : ''} • Duration: {item.duration}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.badgeClass}`}>
                        {meta.label.split('/')[0].trim()}
                      </span>
                      {onDeleteSymptom && (
                        <button
                          type="button"
                          onClick={() => onDeleteSymptom(item.id)}
                          className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs"
                          title="Delete symptom record"
                        >
                          <i className="fas fa-trash-can"></i>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {symptoms.length > 3 && onOpenFullJournal && (
                <button
                  type="button"
                  onClick={onOpenFullJournal}
                  className="w-full py-1.5 text-center text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-1"
                >
                  View all {symptoms.length} entries in full journal →
                </button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // =========================================================================
  // RENDER: FULL SYMPTOM JOURNAL VIEW
  // =========================================================================
  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <i className="fas fa-check-circle text-emerald-400"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header with Actions */}
      <PageHeader
        title="Clinical Symptom Journal & Longitudinal Log"
        subtitle="Record daily physical symptoms, pain severity, duration, and triggers for medical professional sharing"
        onBack={onBack}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon="fas fa-file-pdf"
              onClick={handleExportPDF}
              disabled={symptoms.length === 0}
            >
              Export Clinical PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="fas fa-plus"
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Record Symptom
            </Button>
          </div>
        }
      />

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Logged</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{symptoms.length}</span>
            <span className="text-xs text-slate-500">episodes</span>
          </div>
        </Card>

        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Severity</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">{avgSeverity}</span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>
        </Card>

        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Severe Episodes</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{severeCount}</span>
            <span className="text-xs text-slate-500">≥ 7/10</span>
          </div>
        </Card>

        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Entries</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{todaySymptoms.length}</span>
            <span className="text-xs text-slate-500">today</span>
          </div>
        </Card>
      </div>

      {/* Main Content: Add Modal or Expanded Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-sm">
                  <i className="fas fa-heart-pulse"></i>
                </div>
                <h3 className="font-bold text-base">Record Symptom Episode</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Symptom Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Symptom Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharp Chest Pain, Throbbing Migraine, Dizziness"
                  value={symptomName}
                  onChange={(e) => setSymptomName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_SYMPTOMS.slice(0, 8).map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSymptomName(sym)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] border transition-colors ${
                        symptomName === sym
                          ? 'bg-teal-600 text-white border-teal-600'
                          : darkMode
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Slider (1-10) */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">
                    Severity Level: <span className="text-teal-600 font-extrabold">{severity} / 10</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getSeverityMeta(severity).badgeClass}`}>
                    {getSeverityMeta(severity).label}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                  <span>1 (Very Mild)</span>
                  <span>5 (Moderate)</span>
                  <span>7 (Severe)</span>
                  <span>10 (Debilitating)</span>
                </div>
              </div>

              {/* Duration and Date/Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Duration *
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {COMMON_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="custom">Custom Duration...</option>
                  </select>

                  {duration === 'custom' && (
                    <input
                      type="text"
                      placeholder="e.g. 45 minutes, On and off"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className={`w-full mt-1.5 px-3 py-1.5 rounded-xl text-xs border outline-none ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Body Location / System
                  </label>
                  <select
                    value={bodyPart}
                    onChange={(e) => setBodyPart(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Anatomical Area (Optional)</option>
                    {BODY_PARTS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Triggers & Relieving Factors */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Known Triggers / Contributing Factors
                </label>
                <input
                  type="text"
                  placeholder="e.g. Strenuous exercise, lack of sleep, dehydration, stress"
                  value={triggers}
                  onChange={(e) => setTriggers(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Clinical Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes & Relief Measures
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Took Ibuprofen 400mg with water. Pain started subsiding after 1 hour."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  icon="fas fa-check"
                  disabled={isSubmitting || !symptomName.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card darkMode={darkMode} highContrast={highContrast} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-3 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search logged symptoms, notes, or anatomical areas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs border outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Severity:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'severe', label: 'Severe (7-10)' },
              { id: 'moderate', label: 'Moderate (4-6)' },
              { id: 'mild', label: 'Mild (1-3)' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSeverityFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  severityFilter === f.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : darkMode
                    ? 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Symptom List / Table */}
      {filteredSymptoms.length === 0 ? (
        <div className={`p-12 rounded-2xl border text-center space-y-3 ${
          darkMode ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto text-xl">
            <i className="fas fa-book-medical"></i>
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {searchTerm || severityFilter !== 'all' || dateFilter !== 'all'
              ? 'No matching symptoms found'
              : 'No Symptoms Logged Yet'}
          </h3>
          <p className="text-xs max-w-sm mx-auto">
            {searchTerm || severityFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your search criteria or severity filters.'
              : 'Track your daily physical symptoms, pain levels, and duration to share an accurate timeline with your physician.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            icon="fas fa-plus"
            onClick={() => setShowAddModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Record First Symptom
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSymptoms.map((sym) => {
            const meta = getSeverityMeta(sym.severity);
            return (
              <Card
                key={sym.id}
                darkMode={darkMode}
                highContrast={highContrast}
                className="space-y-3 hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${meta.badgeClass}`}>
                      {sym.severity}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        {sym.symptom}
                        {sym.bodyPart && (
                          <span className="text-[11px] font-normal text-slate-400">
                            • {sym.bodyPart}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Recorded: {sym.date} {sym.time ? `at ${sym.time}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}>
                      Severity: {sym.severity}/10 ({meta.label.split('/')[0].trim()})
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <i className="fas fa-clock mr-1 text-[10px] text-teal-500"></i>
                      {sym.duration}
                    </span>
                    {onDeleteSymptom && (
                      <button
                        type="button"
                        onClick={() => onDeleteSymptom(sym.id)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-xs"
                        title="Delete entry"
                      >
                        <i className="fas fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Additional Clinical Details */}
                {(sym.triggers || sym.notes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {sym.triggers && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 block mb-0.5">
                          Triggers / Context
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">{sym.triggers}</p>
                      </div>
                    )}
                    {sym.notes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 block mb-0.5">
                          Relief Measures & Notes
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">{sym.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
