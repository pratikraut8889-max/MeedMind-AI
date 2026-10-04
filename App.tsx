import React, { useState, useEffect, useRef } from 'react';
import {
  AppMode,
  AccessibilityMode,
  FontSize,
  AnalysisResult,
  VisualSymptomResult,
  StoredReport,
  SUPPORTED_LANGUAGES,
  Medication,
  DoctorLetter,
  Vaccine,
  MoodEntry,
  HealthHistory,
  BodyScanResult,
  EmergencyContact,
  HealthMetricEntry,
  SymptomEntry
} from './types';
import { GeminiService } from './services/geminiService';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FirebaseService } from './services/firebaseService';
import { AuthScreen } from './components/AuthScreen';
import { EmergencyContacts } from './components/EmergencyContacts';
import { HealthTrendsChart } from './components/HealthTrendsChart';
import { MyMedications } from './components/MyMedications';
import { PDFExportService } from './services/pdfExportService';
import { AiHealthChat } from './components/AiHealthChat';
import { SavedReportsView } from './components/SavedReportsView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { SymptomJournal } from './components/SymptomJournal';

// Production SaaS UI Components
import {
  Button,
  Card,
  Badge,
  PageHeader,
  AlertBanner
} from './components/SharedComponents';
import { AppNavigation } from './components/AppNavigation';
import { ReportUploadSection } from './components/ReportUploadSection';
import { ReportResultView } from './components/ReportResultView';
import { EmergencyModeView } from './components/EmergencyModeView';
import { SymptomCheckView } from './components/SymptomCheckView';
import { SettingsModal } from './components/SettingsModal';
import { WellnessCheckinModal } from './components/WellnessCheckinModal';
import { ToastProvider, useToast } from './components/ToastContext';
import { DashboardQuickActions } from './components/DashboardQuickActions';
import { MonthlyHealthTrendsCard } from './components/MonthlyHealthTrendsCard';

// --- Subview: Doctor Letter Document Preview ---
const DoctorLetterView = ({
  letter,
  onClose,
  darkMode
}: {
  letter: DoctorLetter;
  onClose: () => void;
  darkMode: boolean;
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 print:p-0 print:bg-white print:static">
      <div
        className={`w-full max-w-2xl min-h-[75vh] rounded-2xl shadow-2xl p-8 sm:p-10 relative print:shadow-none print:w-full print:h-auto print:rounded-none ${
          darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900 border border-slate-200'
        }`}
      >
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={() => window.print()} icon="fas fa-print">
            Print Letter
          </Button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="space-y-6 pt-4">
          <div className={`border-b pb-6 flex justify-between items-end ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <i className="fas fa-notes-medical text-blue-600 text-lg"></i>
                <h1 className="text-2xl font-bold tracking-tight">Clinical Summary Letter</h1>
              </div>
              <p className="text-xs text-slate-500">Prepared via MediMind AI Clinical Documentation Assistant</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500">{letter.date}</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">{letter.patientName}</p>
            </div>
          </div>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Clinical Narrative Overview
            </h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 text-justify">
              {letter.summary}
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                <i className="fas fa-clipboard-list"></i> Key Findings
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {letter.findings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            {letter.criticalNotes && letter.criticalNotes.length > 0 && (
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50/50 border-rose-200'}`}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                  <i className="fas fa-exclamation-triangle"></i> Noteworthy Clinical Alerts
                </h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300">
                  {letter.criticalNotes.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {letter.questionsForDoctor && letter.questionsForDoctor.length > 0 && (
            <section className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="font-bold text-sm mb-3 text-slate-800 dark:text-slate-200">
                Questions Prepared for Attending Physician
              </h3>
              <div className="space-y-2">
                {letter.questionsForDoctor.map((q, i) => (
                  <div key={i} className="flex gap-2.5 items-start text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {i + 1}
                    </span>
                    <p className="italic text-slate-700 dark:text-slate-300">{q}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 italic">
            This document is patient-generated for informational discussion during clinical consultations. It does not replace independent diagnostic validation by a licensed medical practitioner.
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Subview: Vaccine Tracker ---
const VaccineTracker = ({
  onBack,
  language,
  highContrast,
  darkMode
}: {
  onBack: () => void;
  language: string;
  highContrast: boolean;
  darkMode: boolean;
}) => {
  const [vaccines, setVaccines] = useState<Vaccine[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medimind_vaccines') || '[]');
    } catch {
      return [];
    }
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('medimind_vaccines', JSON.stringify(vaccines));
  }, [vaccines]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          analyzeCard(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeCard = async (base64Data: string) => {
    setIsAnalyzing(true);
    try {
      const data = base64Data.split(',')[1];
      const res = await GeminiService.analyzeVaccines(data, language);
      setVaccines((prev) => [...prev, ...res]);
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert('Could not parse vaccine document. Please try a clearer photo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immunization Records & Vaccine Card"
        subtitle="Track booster timelines, vaccination certificates, and upcoming immunization schedules"
        onBack={onBack}
        actions={
          <Button variant="primary" size="sm" icon="fas fa-plus" onClick={() => setIsAdding(true)}>
            Scan Vaccine Card
          </Button>
        }
      />

      {isAdding && (
        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm">Upload or Scan Immunization Document</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-syringe"></i>
            </div>
            <h4 className="font-bold text-sm">Select CDC or Official Health Certificate</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Our clinical OCR automatically parses vaccine names, administration dates, lot numbers, and recommended booster windows.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                icon="fas fa-file-arrow-up"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Extracting Records...' : 'Choose File'}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </Card>
      )}

      {vaccines.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center ${darkMode ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-syringe text-xl"></i>
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Immunization Records Logged</h3>
          <p className="text-xs mt-1">Upload a photo of your paper CDC card or digital certificate to keep booster dates organized.</p>
          <Button variant="primary" size="sm" icon="fas fa-plus" onClick={() => setIsAdding(true)} className="mt-4">
            Add First Vaccine
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vaccines.map((v) => (
            <Card key={v.id} darkMode={darkMode} highContrast={highContrast} className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm">{v.name}</h4>
                  <p className="text-xs text-slate-500">Administered: {v.dateGiven}</p>
                </div>
                <Badge
                  tone={v.status === 'EXPIRED' ? 'critical' : v.status === 'UPCOMING' ? 'info' : 'success'}
                >
                  {v.status}
                </Badge>
              </div>
              {v.nextDueDate && (
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <i className="fas fa-calendar-check mr-1.5 text-blue-500"></i>
                  Next Booster Window: {v.nextDueDate}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Subview: Health History & Vitals ---
const HealthHistoryView = ({
  onBack,
  darkMode,
  highContrast,
  user,
  medications = [],
  symptoms = [],
  location = 'Global'
}: {
  onBack: () => void;
  darkMode: boolean;
  highContrast: boolean;
  user: any;
  medications?: Medication[];
  symptoms?: SymptomEntry[];
  location?: string;
}) => {
  const [history, setHistory] = useState<HealthHistory>(() => {
    const saved = localStorage.getItem('medimind_health_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      conditions: [],
      surgeries: [],
      familyHistory: [],
      allergies: [],
      bloodType: '',
      organDonor: false,
      emergencyContacts: [],
      metrics: []
    };
  });

  const [newEntry, setNewEntry] = useState({ type: 'conditions', value: '' });

  // PDF Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [pdfPatientName, setPdfPatientName] = useState(() => user?.displayName || user?.email?.split('@')[0] || 'Confidential Patient');
  const [pdfDoctorName, setPdfDoctorName] = useState('');
  const [pdfIncludeMeds, setPdfIncludeMeds] = useState(true);
  const [pdfIncludeSymptoms, setPdfIncludeSymptoms] = useState(true);
  const [pdfIncludeMetrics, setPdfIncludeMetrics] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = FirebaseService.subscribeHealthHistory(user.uid, (data) => {
      if (data) {
        setHistory(data);
        localStorage.setItem('medimind_health_history', JSON.stringify(data));
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveContacts = async (contacts: EmergencyContact[]) => {
    const updated = { ...history, emergencyContacts: contacts };
    setHistory(updated);
    localStorage.setItem('medimind_health_history', JSON.stringify(updated));
    if (user) {
      await FirebaseService.saveHealthHistory(user.uid, updated);
    }
  };

  const handleSaveMetrics = async (metrics: HealthMetricEntry[]) => {
    const updated = { ...history, metrics };
    setHistory(updated);
    localStorage.setItem('medimind_health_history', JSON.stringify(updated));
    if (user) {
      await FirebaseService.saveHealthHistory(user.uid, updated);
    }
  };

  const addEntry = async () => {
    if (!newEntry.value.trim()) return;
    const key = newEntry.type as keyof HealthHistory;
    if (Array.isArray(history[key])) {
      const updated = {
        ...history,
        [key]: [...(history[key] as string[]), newEntry.value.trim()]
      };
      setHistory(updated);
      localStorage.setItem('medimind_health_history', JSON.stringify(updated));
      if (user) {
        await FirebaseService.saveHealthHistory(user.uid, updated);
      }
    }
    setNewEntry({ ...newEntry, value: '' });
  };

  const removeEntry = async (key: keyof HealthHistory, index: number) => {
    if (Array.isArray(history[key])) {
      const newList = [...(history[key] as string[])];
      newList.splice(index, 1);
      const updated = { ...history, [key]: newList };
      setHistory(updated);
      localStorage.setItem('medimind_health_history', JSON.stringify(updated));
      if (user) {
        await FirebaseService.saveHealthHistory(user.uid, updated);
      }
    }
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      const fileName = PDFExportService.exportHealthHistory(history, {
        patientName: pdfPatientName.trim() || 'Confidential Patient',
        patientEmail: user?.email,
        location: location,
        doctorName: pdfDoctorName.trim() || undefined,
        medications: pdfIncludeMeds ? medications : undefined,
        symptoms: pdfIncludeSymptoms ? symptoms : undefined,
        reportDate: Date.now()
      });
      setShowExportModal(false);
      showToast(`Exported Clinical Health History as ${fileName}`);
    } catch (err) {
      console.error(err);
      showToast('Error generating PDF report.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const shareWithDoctor = () => {
    const contactsText =
      history.emergencyContacts && history.emergencyContacts.length > 0
        ? history.emergencyContacts.map((c) => `- ${c.name} (${c.relation}): ${c.phone}`).join('\n')
        : 'None listed';

    const content = `MEDIMIND CLINICAL HEALTH PROFILE & VITALS
Blood Type: ${history.bloodType || 'Not specified'}
Organ Donor Status: ${history.organDonor ? 'Registered' : 'Not registered'}

ACTIVE EMERGENCY CONTACTS:
${contactsText}

CHRONIC CONDITIONS & DIAGNOSES:
${history.conditions.length > 0 ? history.conditions.map((c) => `- ${c}`).join('\n') : 'None recorded'}

PAST SURGERIES & INTERVENTIONS:
${history.surgeries.length > 0 ? history.surgeries.map((s) => `- ${s}`).join('\n') : 'None recorded'}

FAMILY MEDICAL HISTORY:
${history.familyHistory.length > 0 ? history.familyHistory.map((f) => `- ${f}`).join('\n') : 'None recorded'}

KNOWN ALLERGIES & SENSITIVITIES:
${history.allergies.length > 0 ? history.allergies.map((a) => `- ${a}`).join('\n') : 'No known allergies'}
    `;

    if (navigator.share) {
      navigator
        .share({
          title: 'My Medical Health History',
          text: content
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(content);
      showToast('Clinical summary copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <i className="fas fa-check-circle text-emerald-400"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Export Clinical PDF Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-sm">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Export Clinical Health History</h3>
                  <p className="text-[11px] text-slate-500">Format for doctor or specialist sharing</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Patient Full Name</label>
                <input
                  type="text"
                  value={pdfPatientName}
                  onChange={(e) => setPdfPatientName(e.target.value)}
                  placeholder="e.g. Johnathan Doe"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Consulting Physician (Optional)</label>
                <input
                  type="text"
                  value={pdfDoctorName}
                  onChange={(e) => setPdfDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Emily Watson, MD (Neurology)"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider block">
                  Select Included Medical Modules:
                </span>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdfIncludeMeds}
                    onChange={(e) => setPdfIncludeMeds(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <span>Active Prescription Medications & Regimens ({medications.length} active)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdfIncludeSymptoms}
                    onChange={(e) => setPdfIncludeSymptoms(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <span>Recent Symptom Journal Log & Severity Episodes ({symptoms.length} episodes)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdfIncludeMetrics}
                    onChange={(e) => setPdfIncludeMetrics(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <span>Physiological Vitals & Blood Pressure History ({history.metrics?.length || 0} entries)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="fas fa-download"
                disabled={isExportingPDF}
                onClick={handleExportPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isExportingPDF ? 'Generating PDF...' : 'Download Clinical PDF'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Clinical Health History & Tracked Vitals"
        subtitle="Comprehensive longitudinal health markers, chronic conditions, and emergency profiles"
        onBack={onBack}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              icon="fas fa-file-pdf"
              onClick={() => setShowExportModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Export PDF for Doctor
            </Button>
            <Button variant="outline" size="sm" icon="fas fa-share-alt" onClick={shareWithDoctor}>
              Copy Summary
            </Button>
          </div>
        }
      />

      {/* Prominent Clinical Export Callout Banner */}
      <Card darkMode={darkMode} highContrast={highContrast} className="p-4 sm:p-5 border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0 shadow-md">
              <i className="fas fa-file-medical"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Download Official Medical Summary for Doctor Consultations
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
                Generate a formatted, downloadable PDF clinical portfolio consolidating known allergies, active diagnoses, surgical records, current medications, symptom journal episodes, and vitals for your attending physician or hospital intake.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon="fas fa-file-pdf"
            onClick={() => setShowExportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            Export Clinical PDF
          </Button>
        </div>
      </Card>

      {/* Vitals Trends Chart Component */}
      <HealthTrendsChart
        metrics={history.metrics || []}
        onSaveMetrics={handleSaveMetrics}
        darkMode={darkMode}
        highContrast={highContrast}
      />

      {/* Emergency Contacts Section */}
      <EmergencyContacts
        contacts={history.emergencyContacts || []}
        onSaveContacts={handleSaveContacts}
        darkMode={darkMode}
        highContrast={highContrast}
      />

      {/* Core Blood & Organ Donor Context */}
      <Card darkMode={darkMode} highContrast={highContrast} className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Core Biometric Attributes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">ABO / Rh Blood Group</label>
            <select
              value={history.bloodType}
              onChange={async (e) => {
                const updated = { ...history, bloodType: e.target.value };
                setHistory(updated);
                localStorage.setItem('medimind_health_history', JSON.stringify(updated));
                if (user) await FirebaseService.saveHealthHistory(user.uid, updated);
              }}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="">Select Blood Group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="organDonor"
              checked={history.organDonor}
              onChange={async (e) => {
                const updated = { ...history, organDonor: e.target.checked };
                setHistory(updated);
                localStorage.setItem('medimind_health_history', JSON.stringify(updated));
                if (user) await FirebaseService.saveHealthHistory(user.uid, updated);
              }}
              className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
            />
            <label htmlFor="organDonor" className="text-xs font-bold cursor-pointer">
              Registered Organ Donor
            </label>
          </div>
        </div>
      </Card>

      {/* Category Manager (Conditions, Surgeries, Allergies, Family History) */}
      <Card darkMode={darkMode} highContrast={highContrast} className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Add Clinical History Record
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
            className={`p-2.5 rounded-xl border text-xs font-semibold outline-none sm:w-48 ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <option value="conditions">Chronic Condition</option>
            <option value="surgeries">Surgical History</option>
            <option value="familyHistory">Family Predisposition</option>
            <option value="allergies">Allergy / Sensitivity</option>
          </select>
          <input
            type="text"
            value={newEntry.value}
            onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && addEntry()}
            placeholder="e.g. Type 2 Diabetes, Appendectomy (2018), Penicillin allergy..."
            className={`flex-1 p-2.5 rounded-xl border text-xs outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
            }`}
          />
          <Button variant="primary" size="sm" icon="fas fa-plus" onClick={addEntry}>
            Add
          </Button>
        </div>
      </Card>

      {/* Structured Category Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['conditions', 'surgeries', 'familyHistory', 'allergies'] as const).map((key) => {
          const titles: Record<string, { label: string; icon: string }> = {
            conditions: { label: 'Diagnoses & Chronic Conditions', icon: 'fas fa-stethoscope' },
            surgeries: { label: 'Surgical Procedures & Dates', icon: 'fas fa-hospital' },
            familyHistory: { label: 'Hereditary & Family History', icon: 'fas fa-dna' },
            allergies: { label: 'Allergies & Sensitivities', icon: 'fas fa-shield-virus' }
          };
          const items = (history[key] as string[]) || [];

          return (
            <Card key={key} darkMode={darkMode} highContrast={highContrast} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <i className={`${titles[key].icon} text-blue-600 dark:text-blue-400 text-xs`}></i>
                  <h4 className="font-bold text-xs">{titles[key].label}</h4>
                </div>
                <Badge tone="neutral">{items.length}</Badge>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No entries listed in this category.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium">{item}</span>
                      <button
                        onClick={() => removeEntry(key, i)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Delete entry"
                      >
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// --- Subview: Body Scan View ---
const BodyScanView = ({
  onBack,
  language,
  darkMode,
  highContrast
}: {
  onBack: () => void;
  language: string;
  darkMode: boolean;
  highContrast: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<BodyScanResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        console.error('Camera error', e);
      }
    };

    if (!capturedImage) startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [capturedImage]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    analyzeScan(dataUrl);
  };

  const analyzeScan = async (dataUrl: string) => {
    setIsAnalyzing(true);
    try {
      const base64 = dataUrl.split(',')[1];
      const res = await GeminiService.analyzeBodyScan(base64, language);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Unable to process scan. Please ensure adequate lighting.');
      setCapturedImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Body & Skin Lesion Scanner"
        subtitle="Optical biomarker examination for dermatological monitoring, posture, and visible lesions"
        onBack={onBack}
      />

      <div className="relative bg-slate-950 rounded-3xl overflow-hidden min-h-[460px] flex items-center justify-center border border-slate-800 shadow-xl">
        {!capturedImage ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 border-2 border-blue-500/20 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-72 border-2 border-dashed border-white/60 rounded-3xl"></div>
            </div>
            <div className="absolute bottom-6 flex flex-col items-center gap-3 z-20">
              <span className="text-xs font-semibold text-white bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-md">
                Align affected area or anatomical landmark within reticle
              </span>
              <button
                onClick={takePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 hover:scale-105 transition-transform shadow-2xl"
                aria-label="Capture image"
              ></button>
            </div>
          </>
        ) : (
          <img src={capturedImage} alt="Captured scan" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {isAnalyzing && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md text-white space-y-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold tracking-wider uppercase">Performing Optical Clinical Extraction...</p>
          </div>
        )}

        {result && (
          <div className="absolute inset-0 z-40 bg-slate-900/90 backdrop-blur-md p-6 overflow-y-auto">
            <div className="max-w-lg mx-auto space-y-4 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <i className="fas fa-microscope text-blue-400"></i>
                  <h3 className="font-bold text-base">Optical Findings Summary</h3>
                </div>
                <Badge tone="neutral">Evaluated</Badge>
              </div>

              <p className="text-xs leading-relaxed text-slate-300">{result.summary}</p>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Area Findings</h4>
                {result.findings.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>{f.area}</span>
                      <Badge
                        tone={f.severity === 'NORMAL' ? 'success' : f.severity === 'MONITOR' ? 'warning' : 'critical'}
                      >
                        {f.severity}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-[11px]">{f.observation}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Steps</h4>
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <i className="fas fa-check text-blue-400 text-[10px]"></i>
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  setCapturedImage(null);
                  setResult(null);
                }}
                className="w-full mt-4"
              >
                Perform New Scan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Subview: Add Medication Flow ---
const AddMedication = ({
  onCancel,
  onSave,
  language,
  highContrast,
  darkMode
}: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera Capture State
  const [activeCaptureTab, setActiveCaptureTab] = useState<'label' | 'pill'>('label');
  const [capturedLabelImage, setCapturedLabelImage] = useState<string | null>(null);
  const [capturedPillImage, setCapturedPillImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingMode, setAnalyzingMode] = useState<'label' | 'pill' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Pill Verification AI Output
  const [pillVerification, setPillVerification] = useState<{
    shape?: string;
    color?: string;
    imprint?: string;
    description?: string;
    likelyMedication?: string;
    safetyNotes?: string;
  } | null>(null);

  // Form Data
  const [form, setForm] = useState<Partial<Medication>>({
    time: '09:00',
    frequency: 'Daily',
    name: '',
    dosage: '',
    instructions: '',
    pillAppearance: '',
    pillColor: '',
    pillShape: '',
    pillImprint: ''
  });

  const isCameraActive =
    (activeCaptureTab === 'label' && !capturedLabelImage) ||
    (activeCaptureTab === 'pill' && !capturedPillImage);

  useEffect(() => {
    let isCancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        if (isCancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        console.error('Camera access failed', e);
        if (!isCancelled) {
          setCameraError('Camera access unavailable. You can upload an image or enter details manually.');
        }
      }
    };

    if (isCameraActive && !isAnalyzing) {
      startCamera();
    } else if (!isCameraActive && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [activeCaptureTab, capturedLabelImage, capturedPillImage, isAnalyzing, isCameraActive]);

  // Capture Photo from Live Video
  const handleCapture = async () => {
    const c = canvasRef.current;
    const v = videoRef.current;
    if (!c || !v || v.readyState < 2) return;

    if (activeCaptureTab === 'label') {
      // High-res capture for OCR
      c.width = v.videoWidth || 1280;
      c.height = v.videoHeight || 720;
      c.getContext('2d')?.drawImage(v, 0, 0);
      const dataUrl = c.toDataURL('image/jpeg', 0.85);
      setCapturedLabelImage(dataUrl);
      await analyzeLabel(dataUrl);
    } else {
      // Square cropped / scaled capture for pill verification
      const minDim = Math.min(v.videoWidth || 640, v.videoHeight || 480);
      const startX = ((v.videoWidth || minDim) - minDim) / 2;
      const startY = ((v.videoHeight || minDim) - minDim) / 2;
      
      const targetDim = 400; // Optimal thumbnail & storage size
      c.width = targetDim;
      c.height = targetDim;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(v, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);
      }
      const dataUrl = c.toDataURL('image/jpeg', 0.82);
      setCapturedPillImage(dataUrl);
      await verifyPhysicalPill(dataUrl);
    }
  };

  // Analyze Label via OCR Workflow
  const analyzeLabel = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setAnalyzingMode('label');
    try {
      const base64 = dataUrl.split(',')[1];
      const res = await GeminiService.analyzeMedication(base64, language);
      setForm((prev) => ({
        ...prev,
        name: res.name || prev.name,
        dosage: res.dosage || prev.dosage,
        frequency: res.frequency || prev.frequency,
        instructions: res.instructions || prev.instructions
      }));
    } catch (e) {
      console.error(e);
      alert('Could not parse medication label. You can enter or adjust the details manually.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingMode(null);
    }
  };

  // Analyze Physical Pill via Pill Verification AI Workflow
  const verifyPhysicalPill = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setAnalyzingMode('pill');
    try {
      const base64 = dataUrl.split(',')[1];
      const res = await GeminiService.verifyPill(base64, form.name, form.dosage, language);
      setPillVerification(res);
      setForm((prev) => {
        const appearanceParts = [
          res.color,
          res.shape,
          res.imprint ? `imprint "${res.imprint}"` : null
        ].filter(Boolean);
        const autoAppearance = res.description || appearanceParts.join(' ');

        return {
          ...prev,
          pillPhoto: dataUrl,
          pillAppearance: autoAppearance || prev.pillAppearance,
          pillColor: res.color || prev.pillColor,
          pillShape: res.shape || prev.pillShape,
          pillImprint: res.imprint || prev.pillImprint
        };
      });
    } catch (e) {
      console.error(e);
      // Fallback: still keep photo
      setForm((prev) => ({
        ...prev,
        pillPhoto: dataUrl
      }));
    } finally {
      setIsAnalyzing(false);
      setAnalyzingMode(null);
    }
  };

  // File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'label' | 'pill') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      if (mode === 'label') {
        setCapturedLabelImage(dataUrl);
        await analyzeLabel(dataUrl);
      } else {
        setCapturedPillImage(dataUrl);
        await verifyPhysicalPill(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Prescription & Pill Verification"
        subtitle="Capture photos of your medication label and physical pill for automated schedule reminders & visual verification"
        onBack={onCancel}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Optical Camera Infrastructure (Dual Mode: Label OCR & Physical Pill) */}
        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-3">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                id="camera-mode-label"
                onClick={() => setActiveCaptureTab('label')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeCaptureTab === 'label'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <i className="fas fa-file-prescription"></i>
                <span>1. Scan Bottle Label</span>
                {capturedLabelImage && <i className="fas fa-check-circle text-emerald-500 text-[10px]"></i>}
              </button>

              <button
                type="button"
                id="camera-mode-pill"
                onClick={() => setActiveCaptureTab('pill')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeCaptureTab === 'pill'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <i className="fas fa-pills"></i>
                <span>2. Capture Physical Pill</span>
                {capturedPillImage && <i className="fas fa-check-circle text-emerald-500 text-[10px]"></i>}
              </button>
            </div>

            {/* Retake Button if image is captured for current tab */}
            {((activeCaptureTab === 'label' && capturedLabelImage) ||
              (activeCaptureTab === 'pill' && capturedPillImage)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeCaptureTab === 'label') {
                    setCapturedLabelImage(null);
                  } else {
                    setCapturedPillImage(null);
                    setPillVerification(null);
                    setForm((prev) => ({ ...prev, pillPhoto: null }));
                  }
                }}
              >
                Retake
              </Button>
            )}
          </div>

          {/* Camera Viewfinder View */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden min-h-[340px] flex items-center justify-center">
            {/* Live Video Stream when in capture state */}
            {isCameraActive && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Overlays / Reticles based on active mode */}
                {activeCaptureTab === 'label' ? (
                  // Rectangular bottle label reticle
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-[280px] h-[190px] border-2 border-dashed border-blue-400/80 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider bg-black/50 px-2 py-0.5 rounded">
                        Rx Label Target
                      </span>
                    </div>
                  </div>
                ) : (
                  // Circular / pill reticle with alignment crosshair
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="relative w-44 h-44 rounded-full border-2 border-dashed border-purple-400/90 bg-purple-500/10 flex items-center justify-center shadow-2xl">
                      {/* Crosshairs */}
                      <div className="w-8 h-0.5 bg-purple-400/70 absolute"></div>
                      <div className="h-8 w-0.5 bg-purple-400/70 absolute"></div>
                      <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider bg-black/60 px-2.5 py-0.5 rounded-full mt-24">
                        Place Pill Flat
                      </span>
                    </div>
                  </div>
                )}

                {/* Shutter Button & Helper text */}
                <div className="absolute bottom-4 flex flex-col items-center gap-2 z-20">
                  <span className="text-[11px] font-semibold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                    {activeCaptureTab === 'label'
                      ? 'Position prescription bottle label in frame'
                      : 'Center physical pill on a flat surface with direct light'}
                  </span>
                  <button
                    type="button"
                    id={activeCaptureTab === 'label' ? 'snap-label-btn' : 'snap-pill-btn'}
                    onClick={handleCapture}
                    className={`w-14 h-14 rounded-full border-4 shadow-2xl hover:scale-105 transition-transform flex items-center justify-center ${
                      activeCaptureTab === 'label'
                        ? 'bg-blue-600 border-white text-white'
                        : 'bg-purple-600 border-white text-white'
                    }`}
                    aria-label={activeCaptureTab === 'label' ? 'Capture label photo' : 'Capture physical pill photo'}
                  >
                    <i className={`fas ${activeCaptureTab === 'label' ? 'fa-camera' : 'fa-pills'} text-lg`}></i>
                  </button>
                </div>
              </>
            )}

            {/* Static Image Preview when captured */}
            {!isCameraActive && (
              <div className="relative w-full h-full min-h-[340px] flex items-center justify-center bg-black/90 p-4">
                <img
                  src={activeCaptureTab === 'label' ? capturedLabelImage! : capturedPillImage!}
                  alt={activeCaptureTab === 'label' ? 'Captured Rx Label' : 'Captured Physical Pill'}
                  className="max-h-[300px] w-auto max-w-full object-contain rounded-xl"
                />
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 text-white border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                    <i className="fas fa-check text-emerald-400"></i>
                    {activeCaptureTab === 'label' ? 'Label Captured' : 'Physical Pill Captured'}
                  </span>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* AI Analysis Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white space-y-3">
                <div className={`w-10 h-10 border-3 border-t-transparent rounded-full animate-spin ${
                  analyzingMode === 'pill' ? 'border-purple-500' : 'border-blue-500'
                }`}></div>
                <p className="text-xs font-bold tracking-wide">
                  {analyzingMode === 'pill'
                    ? 'Analyzing Physical Pill Shape, Color & Imprint...'
                    : 'Reading Prescription Label & OCR Schedule...'}
                </p>
                <p className="text-[11px] text-slate-300">Evaluating clinical biomarkers with multimodal vision</p>
              </div>
            )}
          </div>

          {/* Camera Controls & File Upload Fallback */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="text-[11px] text-slate-500">
              {activeCaptureTab === 'label' ? (
                <span>Extracts medication name, dose, timing & instructions.</span>
              ) : (
                <span>Records visual proof for safety verification & schedule PDF.</span>
              )}
            </div>

            <label className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-semibold flex items-center gap-1 text-[11px]">
              <i className="fas fa-upload"></i> Upload file
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, activeCaptureTab)}
              />
            </label>
          </div>

          {/* Pill Verification Summary Card (if pill captured) */}
          {capturedPillImage && (
            <div className="mt-3 p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs">
                    <i className="fas fa-shield-check"></i>
                  </div>
                  <h4 className="font-bold text-xs text-purple-950 dark:text-purple-200">
                    Physical Pill Visual Verification
                  </h4>
                </div>
                <Badge tone="success">Verified</Badge>
              </div>

              {/* Detected Pill Attributes */}
              <div className="flex items-center gap-2 flex-wrap">
                {form.pillColor && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <i className="fas fa-palette text-purple-500"></i>
                    <span>Color: {form.pillColor}</span>
                  </span>
                )}
                {form.pillShape && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <i className="fas fa-shapes text-purple-500"></i>
                    <span>Shape: {form.pillShape}</span>
                  </span>
                )}
                {form.pillImprint && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <i className="fas fa-font text-purple-500"></i>
                    <span>Imprint: "{form.pillImprint}"</span>
                  </span>
                )}
              </div>

              {pillVerification?.safetyNotes && (
                <p className="text-[11px] text-purple-900 dark:text-purple-300 leading-relaxed italic">
                  Note: {pillVerification.safetyNotes}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Manual Form & Prescription Details */}
        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Prescription & Dosage Details
            </h3>
            <span className="text-[11px] text-slate-500">
              {capturedLabelImage ? 'Auto-filled via OCR' : 'Manual Entry'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Medication Name</label>
              <input
                type="text"
                id="med-name-input"
                placeholder="e.g. Lisinopril, Metformin, Atorvastatin"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Dosage & Strength</label>
                <input
                  type="text"
                  id="med-dosage-input"
                  placeholder="e.g. 10mg, 500mcg"
                  value={form.dosage || ''}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Scheduled Time</label>
                <input
                  type="time"
                  id="med-time-input"
                  value={form.time || '09:00'}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Dosage Frequency</label>
              <select
                id="med-frequency-select"
                value={form.frequency || 'Daily'}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="Daily">Once Daily (Q.D.)</option>
                <option value="Twice Daily">Twice Daily (B.I.D.)</option>
                <option value="Three Times Daily">Three Times Daily (T.I.D.)</option>
                <option value="Four Times Daily">Four Times Daily (Q.I.D.)</option>
                <option value="Every Other Day">Every Other Day (Q.O.D.)</option>
                <option value="Weekly">Weekly</option>
                <option value="As Needed (PRN)">As Needed (PRN)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Specific Instructions & Food Warnings
              </label>
              <textarea
                id="med-instructions-input"
                placeholder="e.g. Take with morning meal and 8 oz water. Do not crush or chew. Avoid grapefruit."
                rows={2}
                value={form.instructions || ''}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Physical Pill Appearance & Visual Verification Form Section */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <i className="fas fa-eye text-purple-500"></i>
                  <span>Physical Pill Appearance & Verification</span>
                </label>
                {capturedPillImage ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <i className="fas fa-check"></i> Photo Linked
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveCaptureTab('pill')}
                    className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
                  >
                    + Snap Pill Photo
                  </button>
                )}
              </div>

              {/* Physical Pill Photo thumbnail & description preview */}
              {capturedPillImage && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <img
                    src={capturedPillImage}
                    alt="Physical Pill"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">Physical Unit Verified</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {form.pillAppearance || 'Pill photo attached for visual verification.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPillImage(null);
                      setPillVerification(null);
                      setForm((prev) => ({ ...prev, pillPhoto: null }));
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Remove pill photo"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="e.g. White oval scored tablet with imprint M367"
                  value={form.pillAppearance || ''}
                  onChange={(e) => setForm({ ...form, pillAppearance: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. White"
                    value={form.pillColor || ''}
                    onChange={(e) => setForm({ ...form, pillColor: e.target.value })}
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Shape</label>
                  <input
                    type="text"
                    placeholder="e.g. Oval / Round"
                    value={form.pillShape || ''}
                    onChange={(e) => setForm({ ...form, pillShape: e.target.value })}
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Imprint Code</label>
                  <input
                    type="text"
                    placeholder="e.g. M367"
                    value={form.pillImprint || ''}
                    onChange={(e) => setForm({ ...form, pillImprint: e.target.value })}
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              id="save-medication-btn"
              disabled={!form.name?.trim()}
              onClick={() =>
                onSave({
                  id: Date.now().toString(),
                  name: form.name?.trim() || 'Medication',
                  dosage: form.dosage || 'Standard dose',
                  frequency: form.frequency || 'Daily',
                  time: form.time || '09:00',
                  instructions: form.instructions || '',
                  lastTakenDate: null,
                  lastNotificationDate: null,
                  pillPhoto: capturedPillImage || form.pillPhoto || null,
                  pillAppearance: form.pillAppearance || null,
                  pillColor: form.pillColor || null,
                  pillShape: form.pillShape || null,
                  pillImprint: form.pillImprint || null
                })
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Save Schedule
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ==========================================
// Main MediMind Production Application Root
// ==========================================

function MediMindAppContent() {
  const toast = useToast();
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [accessMode, setAccessMode] = useState<AccessibilityMode>(AccessibilityMode.STANDARD);
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('medimind_font_size') as FontSize) || FontSize.MEDIUM);
  const [dyslexicFont, setDyslexicFont] = useState<boolean>(() => localStorage.getItem('medimind_dyslexic_font') === 'true');
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('medimind_dark_mode') === 'true');
  const [language, setLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [location, setLocation] = useState(() => localStorage.getItem('medimind_location') || 'United States');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);

  // User Auth & Persistence
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medimind_meds') || '[]');
    } catch {
      return [];
    }
  });

  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medimind_moods') || '[]');
    } catch {
      return [];
    }
  });

  const [storedReports, setStoredReports] = useState<StoredReport[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medimind_reports') || '[]');
    } catch {
      return [];
    }
  });

  const [symptoms, setSymptoms] = useState<SymptomEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('medimind_symptoms') || '[]');
    } catch {
      return [];
    }
  });

  const isHighContrast = accessMode === AccessibilityMode.HIGH_CONTRAST;

  useEffect(() => {
    localStorage.setItem('medimind_meds', JSON.stringify(medications));
  }, [medications]);
  useEffect(() => {
    localStorage.setItem('medimind_moods', JSON.stringify(moodHistory));
  }, [moodHistory]);
  useEffect(() => {
    localStorage.setItem('medimind_reports', JSON.stringify(storedReports));
  }, [storedReports]);
  useEffect(() => {
    localStorage.setItem('medimind_symptoms', JSON.stringify(symptoms));
  }, [symptoms]);
  useEffect(() => {
    localStorage.setItem('medimind_dark_mode', String(darkMode));
  }, [darkMode]);
  useEffect(() => {
    localStorage.setItem('medimind_font_size', fontSize);
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem('medimind_dyslexic_font', String(dyslexicFont));
  }, [dyslexicFont]);
  useEffect(() => {
    localStorage.setItem('medimind_location', location);
  }, [location]);

  // Live Firestore Sync for logged in users
  useEffect(() => {
    if (!user) return;
    const unsubSymptoms = FirebaseService.subscribeSymptoms(user.uid, (list) => {
      if (list && list.length > 0) {
        setSymptoms(list);
      }
    });
    const unsubMeds = FirebaseService.subscribeMedications(user.uid, (list) => {
      if (list && list.length > 0) {
        setMedications(list);
      }
    });
    return () => {
      unsubSymptoms();
      unsubMeds();
    };
  }, [user]);

  // Symptom Journal Mutation Handlers
  const handleAddSymptom = async (entry: Omit<SymptomEntry, 'id' | 'createdAt'>) => {
    const newSymptom: SymptomEntry = {
      ...entry,
      id: 'sym_' + Date.now(),
      createdAt: Date.now()
    };
    setSymptoms((prev) => [newSymptom, ...prev]);
    if (user) {
      await FirebaseService.saveSymptom(user.uid, newSymptom);
    }
  };

  const handleDeleteSymptom = async (id: string) => {
    setSymptoms((prev) => prev.filter((s) => s.id !== id));
    if (user) {
      await FirebaseService.deleteSymptom(user.uid, id);
    }
    toast.info('Symptom entry removed');
  };

  const handleUpdateSymptom = async (id: string, updates: Partial<SymptomEntry>) => {
    setSymptoms((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    if (user) {
      await FirebaseService.updateSymptom(user.uid, id, updates);
    }
  };

  // Handle clinical report upload
  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const res = await GeminiService.analyzeReport(base64, file.type, language, '', location);
          setAnalysis(res);
          setMode(AppMode.ANALYSIS);
          // Cache report
          const newReport: StoredReport = {
            id: Date.now().toString(),
            date: Date.now(),
            fileName: file.name,
            result: res
          };
          setStoredReports((prev) => [newReport, ...prev].slice(0, 50));
          setIsProcessing(false);
          toast.success('Medical report analyzed and saved to your history.');
        } catch (err: any) {
          console.error(err);
          toast.error(err.message || 'Error analyzing document. Please verify file clarity.');
          setIsProcessing(false);
        }
      };
    } catch (e) {
      console.error(e);
      toast.error('Error reading report file.');
      setIsProcessing(false);
    }
  };

  const handleWellnessSave = (entry: { score: number; energy: string; symptoms: string[]; notes: string }) => {
    const moodMap: Record<number, MoodEntry['mood']> = {
      1: 'terrible',
      2: 'sad',
      3: 'okay',
      4: 'good',
      5: 'great'
    };
    const newMood: MoodEntry = {
      date: new Date().toISOString().split('T')[0],
      mood: moodMap[entry.score] || 'good'
    };
    setMoodHistory((prev) => [newMood, ...prev]);
    toast.success('Daily wellness check-in logged successfully.');
  };

  const loadReport = (r: StoredReport) => {
    setAnalysis(r.result);
    setMode(AppMode.ANALYSIS);
    toast.info(`Viewing ${r.fileName}`);
  };

  // Font size scale class
  const fontSizeClass =
    fontSize === FontSize.LARGE
      ? 'text-lg'
      : fontSize === FontSize.SMALL
      ? 'text-xs'
      : 'text-sm';

  return (
    <div
      className={`min-h-screen flex ${dyslexicFont ? 'font-dyslexic' : ''} ${
        isHighContrast
          ? 'bg-slate-950 text-yellow-300'
          : darkMode
          ? 'bg-slate-900 text-slate-100'
          : 'bg-slate-50 text-slate-800'
      } ${fontSizeClass} transition-colors duration-200`}
    >
      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        language={language}
        setLanguage={setLanguage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        highContrast={isHighContrast}
        setHighContrast={(val) =>
          setAccessMode(val ? AccessibilityMode.HIGH_CONTRAST : AccessibilityMode.STANDARD)
        }
        dyslexicFont={dyslexicFont}
        setDyslexicFont={setDyslexicFont}
        fontSize={
          fontSize === FontSize.LARGE ? 'large' : fontSize === FontSize.SMALL ? 'normal' : 'normal'
        }
        setFontSize={(val) =>
          setFontSize(val === 'large' ? FontSize.LARGE : FontSize.MEDIUM)
        }
        location={location}
        setLocation={setLocation}
        userEmail={user?.email}
        onSignOut={() => FirebaseService.logout()}
      />

      {/* Wellness Check-in Modal */}
      <WellnessCheckinModal
        isOpen={showWellnessModal}
        onClose={() => setShowWellnessModal(false)}
        onSave={handleWellnessSave}
        darkMode={darkMode}
        highContrast={isHighContrast}
      />

      {/* Primary Navigation Component */}
      <AppNavigation
        currentMode={mode}
        onNavigate={(newMode) => {
          if (newMode === AppMode.ANALYSIS && mode !== AppMode.ANALYSIS) {
            // When navigating directly to analysis from nav, keep current analysis or show upload
          }
          setMode(newMode);
        }}
        darkMode={darkMode}
        highContrast={isHighContrast}
        onOpenSettings={() => setShowSettings(true)}
        savedReportsCount={storedReports.length}
        activeMedsCount={medications.length}
        symptomsCount={symptoms.length}
        language={language}
        onLanguageChange={setLanguage}
        userEmail={user?.email}
        onSignOut={() => {
          FirebaseService.logout();
          toast.info('Signed out of session');
        }}
        onSignIn={() => setMode(AppMode.DASHBOARD)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 lg:pb-8">
        {/* Top Patient Bar / Status Header */}
        <header
          className={`sticky top-0 z-30 px-4 sm:px-8 py-3.5 border-b backdrop-blur-md flex items-center justify-between gap-4 ${
            isHighContrast
              ? 'bg-slate-950/90 border-yellow-400/40 text-yellow-300'
              : darkMode
              ? 'bg-slate-900/80 border-slate-800 text-slate-200'
              : 'bg-white/80 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <i className="fas fa-location-dot text-blue-500"></i> {location || 'Global'}
              </span>
            </div>
            <div className="sm:hidden font-bold text-sm text-blue-600 dark:text-blue-400">
              MediMind AI
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wellness check-in quick trigger */}
            <button
              onClick={() => setShowWellnessModal(true)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              title="Daily Wellness & Symptom Check-in"
            >
              <i className="fas fa-heart-pulse text-rose-500"></i>
              <span className="hidden sm:inline">Daily Check-in</span>
            </button>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`text-xs font-bold py-1.5 px-2.5 rounded-xl border outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l} className="text-slate-900 bg-white">
                  {l}
                </option>
              ))}
            </select>

            {/* Quick Emergency 911 Trigger */}
            <button
              onClick={() => setMode(AppMode.EMERGENCY)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-phone-alt"></i>
              <span className="hidden sm:inline">911 Triage</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {/* ==================================== */}
          {/* 1. DASHBOARD VIEW                    */}
          {/* ==================================== */}
          {mode === AppMode.DASHBOARD && (
            <div className="space-y-6 animate-fade-in">
              {/* Executive Patient Welcome */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Clinical Overview & Health Hub
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time clinical second opinions, lab report translation, and medication schedules
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon="fas fa-file-arrow-up"
                    onClick={() => {
                      setAnalysis(null);
                      setMode(AppMode.ANALYSIS);
                    }}
                  >
                    Analyze Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon="fas fa-comment-dots"
                    onClick={() => setMode(AppMode.AI_CHAT)}
                  >
                    Ask AI Assistant
                  </Button>
                </div>
              </div>

              {/* Bento Row: Clinical Quick Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status 1: Reports Count & Red Flags */}
                <Card
                  darkMode={darkMode}
                  highContrast={isHighContrast}
                  className="space-y-2 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  onClick={() => setMode(AppMode.SAVED_REPORTS)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Medical Reports
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-sm">
                      <i className="fas fa-folder-open"></i>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{storedReports.length}</span>
                    <span className="text-xs text-slate-500">archived</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>
                      {storedReports.filter((r) => r.result?.redFlags && r.result.redFlags.length > 0).length} with red flags
                    </span>
                    <span className="text-blue-600 font-semibold">View Archive →</span>
                  </div>
                </Card>

                {/* Status 2: Active Medications */}
                <Card
                  darkMode={darkMode}
                  highContrast={isHighContrast}
                  className="space-y-2 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                  onClick={() => setMode(AppMode.MY_MEDS)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Active Prescriptions
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center text-sm">
                      <i className="fas fa-pills"></i>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{medications.length}</span>
                    <span className="text-xs text-slate-500">regimens</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Scheduled dosage reminders</span>
                    <span className="text-purple-600 font-semibold">Manage Rx →</span>
                  </div>
                </Card>

                {/* Status 3: Tracked Vitals & Health History */}
                <Card
                  darkMode={darkMode}
                  highContrast={isHighContrast}
                  className="space-y-2 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                  onClick={() => setMode(AppMode.HEALTH_HISTORY)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Vitals & History
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-sm">
                      <i className="fas fa-heart-pulse"></i>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">Optimal</span>
                    <span className="text-xs text-emerald-600 font-bold">Stable</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Export clinical summary</span>
                    <span className="text-emerald-600 font-semibold">View History →</span>
                  </div>
                </Card>

                {/* Status 4: Symptom Journal */}
                <Card
                  darkMode={darkMode}
                  highContrast={isHighContrast}
                  className="space-y-2 cursor-pointer hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
                  onClick={() => setMode(AppMode.SYMPTOM_JOURNAL)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Symptom Journal
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-sm">
                      <i className="fas fa-book-medical"></i>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{symptoms.length}</span>
                    <span className="text-xs text-slate-500">logged</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>
                      {symptoms.filter((s) => s.date === new Date().toISOString().split('T')[0]).length} recorded today
                    </span>
                    <span className="text-teal-600 font-semibold">Log Symptom →</span>
                  </div>
                </Card>
              </div>

              {/* Symptom Journal Dashboard Widget */}
              <SymptomJournal
                symptoms={symptoms}
                onAddSymptom={handleAddSymptom}
                onDeleteSymptom={handleDeleteSymptom}
                onUpdateSymptom={handleUpdateSymptom}
                onOpenFullJournal={() => setMode(AppMode.SYMPTOM_JOURNAL)}
                darkMode={darkMode}
                highContrast={isHighContrast}
                isDashboardWidget={true}
                patientName={user?.displayName || user?.email?.split('@')[0] || ''}
              />

              {/* Central Intake: Document Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Document Intake & Analysis
                  </h2>
                  <span className="text-xs text-slate-500">Multimodal OCR & Clinical Intelligence</span>
                </div>
                <ReportUploadSection
                  onUpload={handleUpload}
                  isProcessing={isProcessing}
                  darkMode={darkMode}
                  highContrast={isHighContrast}
                  language={language}
                />
              </div>

              {/* Monthly Health Trends & Red Flag Distribution */}
              <MonthlyHealthTrendsCard
                storedReports={storedReports}
                darkMode={darkMode}
                onViewAllReports={() => setMode(AppMode.SAVED_REPORTS)}
                onUploadNew={() => {
                  setAnalysis(null);
                  setMode(AppMode.ANALYSIS);
                }}
              />

              {/* Primary Clinical Capabilities Grid */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Specialized Health Workspaces
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: AI Assistant */}
                  <div
                    onClick={() => setMode(AppMode.AI_CHAT)}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-base">
                      <i className="fas fa-comment-dots"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold group-hover:text-blue-600 transition-colors">
                        AI Health Assistant
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Interactive consultation with medical evidence grounding in {language}.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Visual Symptom Cam */}
                  <div
                    onClick={() => setMode(AppMode.VISUAL_SYMPTOM_CHECK)}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-base">
                      <i className="fas fa-camera"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold group-hover:text-indigo-600 transition-colors">
                        Visual Symptom Cam
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Optical triage for rash, swelling, and physical complaints.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Emergency Dispatch */}
                  <div
                    onClick={() => setMode(AppMode.EMERGENCY)}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-rose-500 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center text-base">
                      <i className="fas fa-heart-pulse"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold group-hover:text-rose-600 transition-colors">
                        Emergency Triage (911)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Rapid red-flag triage, poison control hotlines, and dispatch aid.
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Reports Portfolio */}
                  <div
                    onClick={() => setMode(AppMode.SAVED_REPORTS)}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-base">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold group-hover:text-emerald-600 transition-colors">
                        Saved Reports & Trends
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Executive summaries, red-flag filtering, and batch PDF summaries.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reports Quick Table (if available) */}
              {storedReports.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Recent Medical Documents
                    </h2>
                    <button
                      onClick={() => setMode(AppMode.SAVED_REPORTS)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All ({storedReports.length}) →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {storedReports.slice(0, 4).map((report) => {
                      const hasHighFlags = report.result?.redFlags?.some((f) => f.severity === 'HIGH');
                      const hasAnyFlags = (report.result?.redFlags?.length || 0) > 0;

                      return (
                        <div
                          key={report.id}
                          onClick={() => loadReport(report)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            darkMode
                              ? 'bg-slate-850 border-slate-800 hover:border-slate-700'
                              : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                              <i className="fas fa-file-medical"></i>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{report.fileName}</p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(report.date).toLocaleDateString()} • {report.result?.labMeasurements?.length || 0} biomarkers evaluated
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {hasHighFlags ? (
                              <Badge tone="critical" icon="fas fa-flag">Critical Alerts</Badge>
                            ) : hasAnyFlags ? (
                              <Badge tone="warning" icon="fas fa-flag">Notes</Badge>
                            ) : (
                              <Badge tone="success" icon="fas fa-check">Clear</Badge>
                            )}
                            <i className="fas fa-chevron-right text-xs text-slate-300"></i>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Compliance & Second-Opinion Disclaimer */}
              <AlertBanner
                tone="info"
                title="Clinical Second Opinion Notice"
                message="MediMind AI translates diagnostic laboratory data into accessible patient guidance. It is not an authorized diagnostic physician. Always confirm findings with your primary healthcare provider."
              />

              {/* Floating Quick Action Group */}
              <DashboardQuickActions
                onUploadReport={() => {
                  setAnalysis(null);
                  setMode(AppMode.ANALYSIS);
                }}
                onAskAssistant={() => setMode(AppMode.AI_CHAT)}
                onWellnessCheckin={() => setShowWellnessModal(true)}
                onLogSymptom={() => setMode(AppMode.SYMPTOM_JOURNAL)}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 2. REPORT ANALYSIS VIEW              */}
          {/* ==================================== */}
          {mode === AppMode.ANALYSIS && (
            <div className="animate-fade-in">
              {analysis ? (
                <ReportResultView
                  result={analysis}
                  darkMode={darkMode}
                  highContrast={isHighContrast}
                  language={language}
                  location={location}
                  onBack={() => {
                    setAnalysis(null);
                    setMode(AppMode.DASHBOARD);
                  }}
                  onReanalyze={() => {
                    setAnalysis(null);
                  }}
                />
              ) : (
                <div className="space-y-6">
                  <PageHeader
                    title="Medical Document Analysis"
                    subtitle="Upload laboratory blood tests, radiology summaries, discharge summaries, or pathology notes"
                    onBack={() => setMode(AppMode.DASHBOARD)}
                  />
                  <ReportUploadSection
                    onUpload={handleUpload}
                    isProcessing={isProcessing}
                    darkMode={darkMode}
                    highContrast={isHighContrast}
                    language={language}
                  />
                </div>
              )}
            </div>
          )}

          {/* ==================================== */}
          {/* 3. AI HEALTH ASSISTANT CHAT          */}
          {/* ==================================== */}
          {mode === AppMode.AI_CHAT && (
            <div className="animate-fade-in">
              <AiHealthChat
                language={language}
                darkMode={darkMode}
                highContrast={isHighContrast}
                onBack={() => setMode(AppMode.DASHBOARD)}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 4. SAVED REPORTS & TRENDS PORTFOLIO  */}
          {/* ==================================== */}
          {mode === AppMode.SAVED_REPORTS && (
            <div className="animate-fade-in">
              <SavedReportsView
                reports={storedReports}
                onSelectReport={(r) => loadReport(r)}
                onDeleteReport={(id) => setStoredReports(storedReports.filter((x) => x.id !== id))}
                onClearAll={() => setStoredReports([])}
                onUpdateReport={(updated) =>
                  setStoredReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
                }
                onBack={() => setMode(AppMode.DASHBOARD)}
                darkMode={darkMode}
                highContrast={isHighContrast}
                location={location}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 5. EMERGENCY TRIAGE MODE             */}
          {/* ==================================== */}
          {mode === AppMode.EMERGENCY && (
            <div className="animate-fade-in">
              <EmergencyModeView
                onBack={() => setMode(AppMode.DASHBOARD)}
                language={language}
                darkMode={darkMode}
                highContrast={isHighContrast}
                location={location}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 6. VISUAL SYMPTOM CAM CHECK         */}
          {/* ==================================== */}
          {mode === AppMode.VISUAL_SYMPTOM_CHECK && (
            <div className="animate-fade-in">
              <SymptomCheckView
                onBack={() => setMode(AppMode.DASHBOARD)}
                language={language}
                darkMode={darkMode}
                highContrast={isHighContrast}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 7. MY MEDICATIONS                    */}
          {/* ==================================== */}
          {mode === AppMode.MY_MEDS && (
            <div className="animate-fade-in">
              <MyMedications
                medications={medications}
                patientName={user?.displayName || user?.email?.split('@')[0] || ''}
                onAdd={() => setMode(AppMode.ADD_MEDICATION)}
                onTake={async (id: string) => {
                  const today = new Date().toISOString().split('T')[0];
                  setMedications(
                    medications.map((m) =>
                      m.id === id ? { ...m, lastTakenDate: today } : m
                    )
                  );
                  if (user) {
                    await FirebaseService.updateMedication(user.uid, id, { lastTakenDate: today });
                  }
                }}
                onDelete={async (id: string) => {
                  setMedications(medications.filter((m) => m.id !== id));
                  if (user) {
                    await FirebaseService.deleteMedication(user.uid, id);
                  }
                  toast.info('Medication removed from schedule');
                }}
                highContrast={isHighContrast}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 8. ADD MEDICATION / RX OCR SCAN      */}
          {/* ==================================== */}
          {mode === AppMode.ADD_MEDICATION && (
            <div className="animate-fade-in">
              <AddMedication
                onCancel={() => setMode(AppMode.MY_MEDS)}
                onSave={async (m: Medication) => {
                  setMedications([...medications, m]);
                  if (user) {
                    await FirebaseService.addMedication(user.uid, m);
                  }
                  toast.success(`Medication "${m.name}" added to schedule.`);
                  setMode(AppMode.MY_MEDS);
                }}
                language={language}
                highContrast={isHighContrast}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 9. VACCINES & IMMUNIZATION CARD      */}
          {/* ==================================== */}
          {mode === AppMode.VACCINE && (
            <div className="animate-fade-in">
              <VaccineTracker
                onBack={() => setMode(AppMode.DASHBOARD)}
                language={language}
                highContrast={isHighContrast}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 10. HEALTH HISTORY & VITALS          */}
          {/* ==================================== */}
          {mode === AppMode.HEALTH_HISTORY && (
            <div className="animate-fade-in">
              <HealthHistoryView
                onBack={() => setMode(AppMode.DASHBOARD)}
                darkMode={darkMode}
                highContrast={isHighContrast}
                user={user}
                medications={medications}
                symptoms={symptoms}
                location={location}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 11. SYMPTOM JOURNAL FULL VIEW        */}
          {/* ==================================== */}
          {mode === AppMode.SYMPTOM_JOURNAL && (
            <div className="animate-fade-in">
              <SymptomJournal
                symptoms={symptoms}
                onAddSymptom={handleAddSymptom}
                onDeleteSymptom={handleDeleteSymptom}
                onUpdateSymptom={handleUpdateSymptom}
                onBack={() => setMode(AppMode.DASHBOARD)}
                darkMode={darkMode}
                highContrast={isHighContrast}
                patientName={user?.displayName || user?.email?.split('@')[0] || ''}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 12. AI BODY SCAN                     */}
          {/* ==================================== */}
          {mode === AppMode.BODY_SCAN && (
            <div className="animate-fade-in">
              <BodyScanView
                onBack={() => setMode(AppMode.DASHBOARD)}
                language={language}
                darkMode={darkMode}
                highContrast={isHighContrast}
              />
            </div>
          )}

          {/* ==================================== */}
          {/* 13. PRIVACY POLICY & DATA AUDIT      */}
          {/* ==================================== */}
          {mode === AppMode.PRIVACY_POLICY && (
            <div className="animate-fade-in">
              <PrivacyPolicyView
                onBack={() => setMode(AppMode.DASHBOARD)}
                onClearAllLocalData={() => {
                  setStoredReports([]);
                  setMedications([]);
                  setMoodHistory([]);
                  setSymptoms([]);
                  localStorage.removeItem('medimind_chat_history');
                  localStorage.removeItem('medimind_health_history');
                  localStorage.removeItem('medimind_reports');
                  localStorage.removeItem('medimind_meds');
                  localStorage.removeItem('medimind_moods');
                  localStorage.removeItem('medimind_vaccines');
                  localStorage.removeItem('medimind_symptoms');
                }}
                darkMode={darkMode}
                highContrast={isHighContrast}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MediMindAppContent />
    </ToastProvider>
  );
}
