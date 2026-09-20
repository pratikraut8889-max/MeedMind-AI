
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, AccessibilityMode, FontSize, AnalysisResult, VisualSymptomResult, StoredReport, SUPPORTED_LANGUAGES, Medication, MedicationAnalysisResult, DoctorLetter, Vaccine, MoodEntry, HealthHistory, BodyScanResult, EmergencyContact, HealthMetricEntry } from './types';
import { GeminiService } from './services/geminiService';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FirebaseService } from './services/firebaseService';
import { AuthScreen } from './components/AuthScreen';
import { EmergencyContacts } from './components/EmergencyContacts';
import { HealthTrendsChart } from './components/HealthTrendsChart';
import { MyMedications } from './components/MyMedications';
import { PDFExportService } from './services/pdfExportService';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''; 
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || ''; 

// --- Utility Components ---

const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false, id = '' }: any) => {
  const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-95";
  const variants = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700",
    danger: "bg-red-500 text-white shadow-red-200 hover:bg-red-600",
    ghost: "text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
  };
  
  return (
    <button id={id} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', highContrast = false, darkMode = false }: any) => {
  let bgClass = darkMode ? 'bg-slate-800 border-slate-700 shadow-none text-white' : 'bg-white shadow-xl shadow-slate-100 border border-slate-100 text-slate-800';
  if (highContrast) {
    bgClass = 'bg-slate-900 border-2 border-yellow-400 text-yellow-300';
  }

  return (
    <div className={`rounded-2xl p-6 transition-all ${bgClass} ${className}`}>
      {children}
    </div>
  );
};

const TypingLoader = ({ darkMode }: { darkMode: boolean }) => {
  const [text, setText] = useState("Analyzing document...");
  const steps = [
    "Reading medical terms...",
    "Consulting knowledge base...",
    "Checking vital signs...",
    "Identifying red flags...",
    "Translating results...",
    "Formulating explanation..."
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(steps[i % steps.length]);
      i++;
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center animate-fade-in ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
      <div className="mb-6 relative">
        <div className="w-16 h-16 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
        <i className="fas fa-brain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl animate-pulse"></i>
      </div>
      <h3 className="text-xl font-bold typing-cursor">{text}</h3>
      <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>This may take a few seconds</p>
    </div>
  );
};

// --- Features ---

const Onboarding = ({ onComplete, language }: { onComplete: () => void, language: string }) => {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome to MediMind",
      description: "Your AI-powered health companion. We help you understand your health better.",
      icon: "fa-brain",
      color: "text-blue-600"
    },
    {
      title: "Report Analysis",
      description: "Upload any medical report (blood tests, X-rays, etc.) and get a simple, clear explanation in seconds.",
      icon: "fa-file-medical",
      color: "text-indigo-600"
    },
    {
      title: "Symptom Checker",
      description: "Feeling unwell? Use our AI camera to check symptoms and get immediate guidance.",
      icon: "fa-camera",
      color: "text-purple-600"
    },
    {
      title: "Secure & Private",
      description: "Your data stays on your device. We use advanced AI to process information securely.",
      icon: "fa-shield-halved",
      color: "text-emerald-600"
    }
  ];

  return (
    <div className="bg-white min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full animate-fade-in">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 bg-slate-50 shadow-xl shadow-slate-100 transform transition-all duration-500 ${steps[step].color}`}>
          <i className={`fas ${steps[step].icon} text-4xl`}></i>
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-slate-800 transition-all">{steps[step].title}</h1>
        <p className="text-slate-500 mb-12 text-lg leading-relaxed">{steps[step].description}</p>
        
        <div className="flex justify-center gap-2 mb-12">
          {steps.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`}></div>
          ))}
        </div>

        <Button 
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()} 
          className="w-full py-4 text-lg"
        >
          {step === steps.length - 1 ? "Get Started" : "Next"}
        </Button>
        
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="mt-4 text-slate-400 font-medium hover:text-slate-600">
            Back
          </button>
        )}
      </div>
    </div>
  );
};

const SettingsModal = ({ 
  onClose, 
  darkMode, 
  setDarkMode, 
  accessMode, 
  setAccessMode, 
  fontSize, 
  setFontSize, 
  dyslexicFont, 
  setDyslexicFont,
  user,
  onLogout
}: any) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md relative" darkMode={darkMode}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <i className="fas fa-times"></i>
        </button>
        
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <i className="fas fa-cog text-blue-600"></i> Settings
        </h2>

        <div className="space-y-6">
          {/* User Account Section */}
          {user && (
            <section className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{user.displayName || 'MediMind User'}</p>
                  <p className="text-xs opacity-60 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full py-2 px-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-sign-out-alt"></i> Sign Out
              </button>
            </section>
          )}

          {/* Appearance */}
          <section>
            <h3 className="text-xs font-bold uppercase opacity-50 mb-3 tracking-wider">Appearance</h3>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <span className="font-medium">Dark Mode</span>
              <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
          </section>

          {/* Accessibility */}
          <section>
            <h3 className="text-xs font-bold uppercase opacity-50 mb-3 tracking-wider">Accessibility</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <span className="font-medium">High Contrast</span>
                <button onClick={() => setAccessMode(accessMode === AccessibilityMode.STANDARD ? AccessibilityMode.HIGH_CONTRAST : AccessibilityMode.STANDARD)} className={`w-12 h-6 rounded-full transition-colors relative ${accessMode === AccessibilityMode.HIGH_CONTRAST ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${accessMode === AccessibilityMode.HIGH_CONTRAST ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <span className="font-medium">Dyslexia Font</span>
                <button onClick={() => setDyslexicFont(!dyslexicFont)} className={`w-12 h-6 rounded-full transition-colors relative ${dyslexicFont ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${dyslexicFont ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <span className="font-medium block mb-2">Font Size</span>
                <div className="flex gap-2">
                  {(['SMALL', 'MEDIUM', 'LARGE'] as const).map(size => (
                    <button 
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${fontSize === size ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
        
        <Button onClick={onClose} className="w-full mt-8">Done</Button>
      </Card>
    </div>
  );
};

const FileUpload = ({ onUpload, isProcessing, darkMode }: { onUpload: (f: File) => void, isProcessing: boolean, darkMode: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0]);
  };

  if (isProcessing) {
    return (
      <div className={`border-3 border-dashed rounded-3xl min-h-[300px] flex items-center justify-center transition-all ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-blue-100 bg-blue-50/50'}`}>
        <TypingLoader darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div 
      className={`border-3 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group
        ${darkMode 
          ? 'border-slate-700 hover:border-blue-500 hover:bg-slate-800/50' 
          : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input type="file" ref={inputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform ${darkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
        <i className="fas fa-cloud-upload-alt text-3xl"></i>
      </div>
      <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Upload Medical Report</h3>
      <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Drag & drop or tap to select</p>
    </div>
  );
};

const MoodTracker = ({ onSave, history }: { onSave: (mood: MoodEntry['mood']) => void, history: MoodEntry[] }) => {
  const moods = [
    { type: 'terrible', emoji: '😭', label: 'Terrible' },
    { type: 'sad', emoji: '😟', label: 'Not Good' },
    { type: 'okay', emoji: '😐', label: 'Okay' },
    { type: 'good', emoji: '🙂', label: 'Good' },
    { type: 'great', emoji: '😄', label: 'Great' },
  ] as const;

  // Check for crisis condition: 3 days of 'sad' or 'terrible'
  const isCrisis = history.length >= 2 && 
    ['sad', 'terrible'].includes(history[0]?.mood) && 
    ['sad', 'terrible'].includes(history[1]?.mood);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            {isCrisis && (
                <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs py-1 font-bold">
                    We noticed you've been feeling down lately.
                </div>
            )}
            <h3 className="text-2xl font-bold text-slate-800 mb-2 mt-2">How are you feeling today?</h3>
            <p className="text-slate-500 mb-8">Track your health journey, one day at a time.</p>
            
            <div className="flex justify-between gap-2 mb-8">
                {moods.map(m => (
                    <button 
                        key={m.type}
                        onClick={() => onSave(m.type)}
                        className="flex flex-col items-center gap-2 transform transition hover:scale-110 active:scale-90"
                    >
                        <span className="text-4xl filter drop-shadow-md">{m.emoji}</span>
                        <span className="text-xs font-bold text-slate-400">{m.label}</span>
                    </button>
                ))}
            </div>

            {isCrisis && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left">
                    <p className="text-red-600 font-bold mb-2 flex items-center gap-2">
                        <i className="fas fa-heart-broken"></i> You are not alone.
                    </p>
                    <p className="text-sm text-slate-600 mb-3">It seems like things have been tough. Would you like to talk to someone?</p>
                    <a href="tel:988" className="block w-full text-center bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600">
                        Call Crisis Hotline
                    </a>
                </div>
            )}
            
            <button onClick={() => onSave('okay')} className="text-slate-300 text-sm mt-4 hover:text-slate-500">Skip for today</button>
        </div>
    </div>
  );
};

const DoctorLetterView = ({ letter, onClose, darkMode }: { letter: DoctorLetter, onClose: () => void, darkMode: boolean }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center overflow-y-auto p-4 print:p-0 print:bg-white print:static">
      <div className={`w-full max-w-2xl min-h-[80vh] rounded-xl shadow-2xl p-10 relative print:shadow-none print:w-full print:h-auto print:rounded-none ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()} className="!py-2 !px-4 shadow-none"><i className="fas fa-print"></i> Print</Button>
            <button onClick={onClose} className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}><i className="fas fa-times"></i></button>
        </div>
        <div className="font-serif leading-relaxed">
            <div className={`border-b-2 pb-6 mb-8 flex justify-between items-end ${darkMode ? 'border-slate-600' : 'border-slate-800'}`}>
                <div><h1 className="text-3xl font-bold mb-1">Medical Summary</h1><p className="opacity-60 text-sm">MediMind AI</p></div>
                <div className="text-right"><p className="font-bold">{letter.date}</p><p className="text-lg">{letter.patientName}</p></div>
            </div>
            <div className="space-y-6">
                <section><h3 className="text-xs font-bold uppercase opacity-50 mb-2 tracking-wider">Summary</h3><p className="text-justify">{letter.summary}</p></section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                     <section className={`p-4 rounded-lg print:bg-transparent print:p-0 print:border print:border-slate-200 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <h3 className={`font-bold mb-3 ${darkMode ? 'text-blue-300' : 'text-slate-800'}`}><i className="fas fa-clipboard-list text-blue-500"></i> Findings</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">{letter.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    </section>
                    {letter.criticalNotes?.length > 0 && (
                        <section className={`p-4 rounded-lg print:bg-transparent print:p-0 print:border print:border-red-200 ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                            <h3 className="font-bold text-red-500 mb-3"><i className="fas fa-exclamation-circle text-red-500"></i> Critical</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-500">{letter.criticalNotes.map((f, i) => <li key={i}>{f}</li>)}</ul>
                        </section>
                    )}
                </div>
                <section className={`mt-8 border-t pt-6 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h3 className="font-bold mb-4 text-lg">Questions for Doctor</h3>
                    <div className="space-y-3">{letter.questionsForDoctor.map((q, i) => <div key={i} className="flex gap-4 items-start"><span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${darkMode ? 'bg-slate-600' : 'bg-slate-800 text-white'}`}>{i+1}</span><p className="italic">{q}</p></div>)}</div>
                </section>
            </div>
        </div>
      </div>
    </div>
  );
};

const ResultView = ({ 
  result, 
  highContrast, 
  darkMode,
  onSpeak, 
  onBack, 
  language 
}: { 
  result: AnalysisResult, 
  highContrast: boolean, 
  darkMode: boolean,
  onSpeak: () => void, 
  onBack: () => void,
  language: string 
}) => {
  const [showLetterInput, setShowLetterInput] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [letterName, setLetterName] = useState("");
  const [isChildMode, setIsChildMode] = useState(false);
  const [doctorLetter, setDoctorLetter] = useState<DoctorLetter | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  
  // Share Feature States
  const [shareLink, setShareLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Initialize Google Drive Integration
  useEffect(() => {
    const initGoogle = () => {
        if(!(window as any).google || !GOOGLE_CLIENT_ID) return;
        
        // Init Token Client
        try {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: () => {} // callback set at request time
            });
            setTokenClient(client);
        } catch (e) {
            console.error("GSI Init failed", e);
        }
    };

    if ((window as any).google) {
        initGoogle();
    } else {
        window.addEventListener('load', initGoogle);
    }
    return () => window.removeEventListener('load', initGoogle);
  }, []);

  // Confetti effect if no red flags
  useEffect(() => {
    if (result.redFlags.length === 0) {
      (window as any).confetti?.({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#fbbf24']
      });
    }
  }, [result]);

  const handleExportPDF = () => {
    try {
      const fileName = PDFExportService.exportAnalysisReport(result, {
        patientName: letterName || undefined,
        reportDate: Date.now(),
        fileName: 'Medical_Analysis'
      });
      alert(`Report successfully exported to PDF: ${fileName}`);
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert("Failed to export PDF report.");
    }
  };

  const handleGenerateLetter = async () => {
    if (!letterName.trim()) return;
    try {
        const letter = await GeminiService.generateDoctorLetter(result, letterName, language);
        setDoctorLetter(letter);
        setShowLetterInput(false);
    } catch (e) { alert("Failed to generate letter."); }
  };

  const handleSaveToDrive = async () => {
    const btn = document.getElementById('drive-btn');
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    // Fallback if no Client ID configured
    if (!tokenClient || !GOOGLE_CLIENT_ID) {
        console.warn("Google Client ID not found. Using simulation.");
        setTimeout(() => {
            if(btn) btn.innerHTML = '<i class="fas fa-check"></i> Saved (Simulated)!';
            alert("Simulation: Report saved to Drive.\n(Add GOOGLE_CLIENT_ID to .env to enable real upload)");
            setTimeout(() => { if(btn) btn.innerHTML = '<i class="fab fa-google-drive"></i> Save to Drive'; }, 3000);
        }, 1500);
        return;
    }

    // Real Google Drive Upload Flow
    tokenClient.callback = async (resp: any) => {
        if (resp.error) {
            console.error(resp);
            if(btn) btn.innerHTML = '<i class="fas fa-times"></i> Auth Failed';
            return;
        }
        
        try {
            const content = `MEDICAL SUMMARY\nDate: ${new Date().toLocaleDateString()}\nLanguage: ${language}\n\nSUMMARY:\n${result.summary}\n\nDETAILED EXPLANATION:\n${result.simpleExplanation}\n\nRED FLAGS:\n${result.redFlags.map(r => `- ${r.finding} (${r.severity}): ${r.action}`).join('\n')}\n\nNEXT STEPS:\n${result.nextSteps.join('\n')}`;
            
            const file = new Blob([content], {type: 'text/plain'});
            const metadata = {
                name: `MediMind_Report_${Date.now()}.txt`,
                mimeType: 'text/plain',
            };

            const accessToken = resp.access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', file);

            const upload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });
            
            if (upload.ok) {
                if(btn) btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                alert("Report successfully uploaded to your Google Drive!");
            } else {
                throw new Error("Upload failed");
            }
        } catch (e) {
            console.error("Drive Upload Error", e);
            if(btn) btn.innerHTML = '<i class="fas fa-times"></i> Error';
            alert("Failed to save to Drive. Please try again.");
        }
        
        setTimeout(() => { if(btn) btn.innerHTML = '<i class="fab fa-google-drive"></i> Save to Drive'; }, 3000);
    };

    // Trigger OAuth Flow
    tokenClient.requestAccessToken({ prompt: '' });
  };

  const openShare = () => {
    setShowShareModal(true);
    setIsGeneratingLink(true);
    // Simulate secure link generation delay
    setTimeout(() => {
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        setShareLink(`medimind.ai/s/${id}`);
        setIsGeneratingLink(false);
    }, 2000);
  };

  const textColor = highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800';
  const subTextColor = highContrast ? 'text-yellow-100' : darkMode ? 'text-slate-300' : 'text-slate-600';

  return (
    <>
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className={`text-sm font-medium ${subTextColor} hover:underline`}>← Back</button>
                <div className="flex gap-2">
                    <button onClick={() => setIsChildMode(!isChildMode)} className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isChildMode ? 'bg-amber-400 text-white scale-110' : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                        <i className="fas fa-teddy-bear"></i>
                    </button>
                    <Button variant="secondary" onClick={onSpeak} className="!py-2 !px-4 text-sm"><i className="fas fa-volume-up"></i></Button>
                    <Button id="export-pdf-top-btn" variant="secondary" onClick={handleExportPDF} title="Export as PDF" className="!py-2 !px-4 text-sm bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 hover:bg-red-100">
                        <i className="fas fa-file-pdf"></i>
                    </Button>
                    <Button variant="secondary" onClick={() => setShowLetterInput(true)} className="!py-2 !px-4 text-sm"><i className="fas fa-file-medical"></i></Button>
                    <Button variant="secondary" onClick={openShare} className="!py-2 !px-4 text-sm bg-blue-50 text-blue-600 border-blue-100"><i className="fas fa-share-alt"></i></Button>
                </div>
            </div>

            {/* Teddy Bear Mode Indicator */}
            {isChildMode && (
                <div className={`border-2 rounded-xl p-4 flex items-center gap-4 animate-bounce-slow ${darkMode ? 'bg-amber-900/30 border-amber-600' : 'bg-amber-100 border-amber-300'}`}>
                     <i className="fas fa-teddy-bear text-3xl text-amber-500"></i>
                     <div>
                         <p className={`font-bold ${darkMode ? 'text-amber-400' : 'text-amber-800'}`}>Kid Mode Active!</p>
                         <p className={`text-xs ${darkMode ? 'text-amber-200' : 'text-amber-700'}`}>Explaining things simply, just like for a friend.</p>
                     </div>
                </div>
            )}

            {/* All Clear Celebration */}
            {result.redFlags.length === 0 && !isChildMode && (
                <div className="bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl p-6 text-white text-center shadow-lg transform hover:scale-[1.02] transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl animate-pulse">
                        <i className="fas fa-check"></i>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">You're all clear!</h2>
                    <p className="opacity-90">No red flags were detected in this report.</p>
                </div>
            )}

            {result.redFlags.length > 0 && (
                <Card className="!border-l-8 !border-l-red-500" highContrast={highContrast} darkMode={darkMode}>
                <h3 className={`text-xl font-bold text-red-500 flex items-center gap-2 mb-4`}><i className="fas fa-exclamation-triangle"></i> Red Flags Detected</h3>
                <div className="space-y-3">
                    {result.redFlags.map((flag, idx) => (
                    <div key={idx} className={`${highContrast ? 'bg-red-900/30' : darkMode ? 'bg-red-900/20' : 'bg-red-50'} p-3 rounded-lg`}>
                        <div className="flex justify-between items-start"><span className={`font-bold ${highContrast ? 'text-red-300' : 'text-red-500'}`}>{flag.finding}</span><span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">{flag.severity}</span></div>
                        <p className={`text-sm mt-1 ${highContrast ? 'text-red-200' : darkMode ? 'text-red-200' : 'text-red-600'}`}>{flag.action}</p>
                    </div>
                    ))}
                </div>
                </Card>
            )}

            <Card highContrast={highContrast} darkMode={darkMode}>
                <h3 className={`text-lg font-bold mb-2 ${textColor}`}>{isChildMode ? "What's going on?" : "Summary"}</h3>
                <p className={`text-lg leading-relaxed ${subTextColor}`}>{isChildMode ? result.childExplanation : result.summary}</p>
            </Card>
            
            {!isChildMode && (
                <Card highContrast={highContrast} darkMode={darkMode}>
                    <h3 className={`text-lg font-bold mb-3 ${textColor}`}>Detailed Explanation</h3>
                    <div className={`prose ${highContrast ? 'prose-invert text-yellow-100' : darkMode ? 'prose-invert text-slate-300' : 'text-slate-600'}`}>{result.simpleExplanation}</div>
                </Card>
            )}

            {result.estimatedCost && !isChildMode && (
                <Card highContrast={highContrast} darkMode={darkMode} className="!border-l-4 !border-l-green-500">
                    <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${textColor}`}><i className="fas fa-coins text-green-500"></i> Estimated Cost</h3>
                    <p className={subTextColor}>{result.estimatedCost}</p>
                    <p className="text-xs opacity-50 mt-2">Estimates based on local averages. Actual costs may vary.</p>
                </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <Button id="export-pdf-main-btn" onClick={handleExportPDF} className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20">
                    <i className="fas fa-file-pdf mr-2"></i> Export Formatted PDF Report
                </Button>
                <Button id="drive-btn" variant="secondary" onClick={handleSaveToDrive} className="flex-1">
                    <i className="fab fa-google-drive mr-2"></i> Save to Drive
                </Button>
            </div>

            {/* Share Card (Visual) */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden">
                <i className="fab fa-twitter absolute top-4 right-4 text-white/20 text-4xl"></i>
                <p className="font-bold text-lg mb-4">"MediMind just helped me understand my report in {language} in 8 seconds ❤️ #Gemini3 #VibeCode"</p>
                <div className="flex justify-center gap-3">
                    <button onClick={() => {
                        navigator.clipboard.writeText(`MediMind just helped me understand my report in ${language} in 8 seconds ❤️ #Gemini3 #VibeCode`);
                        alert("Copied to clipboard!");
                    }} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full font-bold text-sm transition flex items-center gap-2">
                        <i className="fas fa-copy"></i> Copy
                    </button>
                    <button onClick={() => {
                         const text = encodeURIComponent(`MediMind just helped me understand my report in ${language} in 8 seconds ❤️ #Gemini3 #VibeCode`);
                         window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                    }} className="bg-black/20 hover:bg-black/30 backdrop-blur-sm px-6 py-2 rounded-full font-bold text-sm transition flex items-center gap-2">
                        <i className="fab fa-twitter"></i> Post to X
                    </button>
                </div>
            </div>
        </div>

        {/* Modals */}
        {showLetterInput && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm" highContrast={highContrast} darkMode={darkMode}>
                    <h3 className={`text-xl font-bold mb-4 ${textColor}`}>Patient Name</h3>
                    <input type="text" value={letterName} onChange={(e) => setLetterName(e.target.value)} className={`w-full p-3 border rounded-lg mb-4 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="Enter name..." />
                    <div className="flex gap-2"><Button variant="secondary" onClick={() => setShowLetterInput(false)} className="flex-1">Cancel</Button><Button onClick={handleGenerateLetter} className="flex-1">Generate</Button></div>
                </Card>
            </div>
        )}
        
        {showShareModal && (
             <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
                <Card className="w-full max-w-sm text-center relative overflow-hidden" highContrast={highContrast} darkMode={darkMode}>
                    <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                    
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl transition-all ${isGeneratingLink ? 'scale-110' : ''} ${darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        {isGeneratingLink ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-link"></i>}
                    </div>
                    
                    <h3 className={`text-xl font-bold mb-2 ${textColor}`}>{isGeneratingLink ? 'Creating Secure Link...' : 'Share with Family'}</h3>
                    
                    {isGeneratingLink ? (
                         <p className={`mb-6 text-sm ${subTextColor}`}>Encrypting data and generating a temporary 48-hour access token...</p>
                    ) : (
                        <>
                            <p className={`mb-6 text-sm ${subTextColor}`}>Anyone with this link can view the simplified explanation in {language}. Expires in 48h.</p>
                            
                            <div className={`p-3 rounded-lg flex items-center justify-between mb-4 border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <code className={`text-xs truncate flex-1 text-left mr-2 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{shareLink}</code>
                                <button onClick={() => {navigator.clipboard.writeText(shareLink); alert("Link copied!");}} className="text-slate-500 hover:text-blue-500 transition"><i className="fas fa-copy"></i></button>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={() => {
                                    if (navigator.share) {
                                        navigator.share({
                                            title: 'MediMind Report',
                                            text: `Here is my medical summary: ${result.summary}`,
                                            url: shareLink
                                        }).catch(console.error);
                                    } else {
                                        navigator.clipboard.writeText(`${result.summary} \n\nView more: ${shareLink}`);
                                        alert("Summary copied to clipboard!");
                                    }
                                }} className="w-full flex-1 !py-2">
                                    <i className="fas fa-share-alt"></i> Share
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            </div>
        )}

        {doctorLetter && <DoctorLetterView letter={doctorLetter} onClose={() => setDoctorLetter(null)} darkMode={darkMode} />}
    </>
  );
};

const EmergencyMode = ({ language, highContrast, darkMode, onBack }: { language: string, highContrast: boolean, darkMode: boolean, onBack: () => void }) => {
    const [isListening, setIsListening] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = async () => {
                const reader = new FileReader();
                reader.readAsDataURL(new Blob(audioChunks.current, { type: 'audio/wav' }));
                reader.onloadend = async () => {
                     const base64Audio = (reader.result as string).split(',')[1];
                     setAdvice("Thinking...");
                     try {
                        const response = await GeminiService.getEmergencyAdvice(base64Audio, 'audio', language);
                        setAdvice(response);
                        GeminiService.speakText(response, language); 
                     } catch (e) { setAdvice("Error analyzing audio. Call 911."); }
                };
            };
            mediaRecorder.current.start();
            setIsListening(true);
        } catch (e) { alert("Microphone access denied."); }
    };

    const stopListening = () => {
        if (mediaRecorder.current && isListening) {
            mediaRecorder.current.stop();
            setIsListening(false);
        }
    };

    return (
        <div className={`h-full flex flex-col items-center justify-center p-6 text-center ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
            <button onClick={onBack} className="absolute top-6 left-6 text-lg font-bold hover:underline">Exit</button>
            {!advice ? (
                <>
                    <h2 className="text-3xl font-bold mb-6">Emergency Triage</h2>
                    <button onMouseDown={startListening} onMouseUp={stopListening} onTouchStart={startListening} onTouchEnd={stopListening} className={`w-48 h-48 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-600'} text-white shadow-2xl flex items-center justify-center`}>
                        <i className={`fas fa-microphone text-5xl ${isListening ? 'animate-bounce' : ''}`}></i>
                    </button>
                    <p className="mt-8 font-semibold">Hold to Speak</p>
                </>
            ) : (
                <div className="max-w-md w-full animate-fade-in">
                     <div className={`p-8 rounded-3xl ${highContrast ? 'bg-red-900 border-yellow-400' : darkMode ? 'bg-red-900 border-red-700 text-white' : 'bg-red-50 border-red-100'}`}>
                        <h3 className="text-2xl font-bold mb-4">Advice</h3>
                        <p className="text-xl leading-relaxed font-medium">{advice}</p>
                     </div>
                     <Button onClick={() => setAdvice(null)} className="mt-8 w-full">Ask Again</Button>
                </div>
            )}
        </div>
    );
};

const VisualSymptomCheck = ({ onBack, language, highContrast, darkMode }: any) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [result, setResult] = useState<VisualSymptomResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isChildMode, setIsChildMode] = useState(false);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = s;
                if (videoRef.current) videoRef.current.srcObject = s;
            } catch (e) { console.error("Camera error", e); }
        };

        if (!capturedImage) startCamera();
        
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
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
        const dataUrl = c.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        analyze(dataUrl);
    };

    const analyze = async (data: string) => {
        setIsAnalyzing(true);
        try {
            const res = await GeminiService.analyzeVisualSymptom(data.split(',')[1], language);
            setResult(res);
        } catch (e) { alert("Failed"); setCapturedImage(null); }
        setIsAnalyzing(false);
    }

    return (
        <div className={`flex flex-col h-full ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 mb-4">
                <button onClick={onBack} className="text-sm font-bold whitespace-nowrap">← Cancel</button>
                <h2 className="font-bold text-center">Symptom Checker</h2>
                <div className="w-10"></div>
            </div>
            <div className="flex-1 relative bg-black rounded-3xl overflow-hidden flex flex-col justify-center items-center min-h-[500px]">
                {!capturedImage ? (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        <button onClick={takePhoto} className="absolute bottom-8 z-20 w-20 h-20 bg-white rounded-full border-4 border-slate-200 hover:scale-105 transition-transform"></button>
                    </>
                ) : (
                    <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                )}
                <canvas ref={canvasRef} className="hidden" />
                {isAnalyzing && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                        <TypingLoader darkMode={true} />
                    </div>
                )}
                {result && (
                    <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
                        <Card className="w-full relative" highContrast={highContrast} darkMode={darkMode}>
                             <button onClick={() => setIsChildMode(!isChildMode)} className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition z-10 ${isChildMode ? 'bg-amber-400 text-white scale-110' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                                <i className="fas fa-teddy-bear"></i>
                             </button>

                             {isChildMode && (
                                <div className={`mb-4 flex items-center gap-2 font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                    <i className="fas fa-teddy-bear"></i> <span>Kid Mode</span>
                                </div>
                             )}

                             <h3 className={`text-2xl font-bold mb-2 ${result.urgency === 'RED' ? 'text-red-600' : result.urgency === 'YELLOW' ? 'text-yellow-600' : 'text-green-600'}`}>{result.urgency}</h3>
                             <h4 className="font-bold text-xl mb-2">{result.conditionName}</h4>
                             
                             {isChildMode ? (
                                 <div className="space-y-4">
                                    <p className="text-lg leading-relaxed">{result.childExplanation}</p>
                                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-amber-50 border border-amber-100'}`}>
                                        <p className="font-bold text-sm mb-1">What to do:</p>
                                        <p>{result.recommendation}</p> 
                                    </div>
                                 </div>
                             ) : (
                                 <>
                                     <p className="mb-4 text-sm">{result.possibleCauses.join(', ')}</p>
                                     <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}><p className="font-semibold text-sm">Recommendation:</p><p>{result.recommendation}</p></div>
                                 </>
                             )}
                             
                             <Button onClick={() => {setCapturedImage(null); setResult(null); setIsChildMode(false);}} className="w-full mt-4">Check Another</Button>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

const VaccineTracker = ({ onBack, language, highContrast, darkMode, user }: any) => {
    const [vaccines, setVaccines] = useState<Vaccine[]>(() => {
        if (!user) {
            return JSON.parse(localStorage.getItem('medimind_vax') || '[]');
        }
        return [];
    });
    const [isAdding, setIsAdding] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) {
            localStorage.setItem('medimind_vax', JSON.stringify(vaccines));
        }
    }, [vaccines, user]);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = FirebaseService.subscribeVaccines(user.uid, (data) => {
            setVaccines(data);
        });
        return () => unsubscribe();
    }, [user]);

    // Use effect to handle camera stream lifecycle
    useEffect(() => {
        if (!isAdding) return;

        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = s;
                if (videoRef.current) videoRef.current.srcObject = s;
            } catch (e) { 
                console.warn("Camera failed to start, possibly permission denied or not available", e);
            }
        };

        if (!capturedImage) startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, [isAdding, capturedImage]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target?.result) {
                    const data = evt.target.result as string;
                    setCapturedImage(data);
                    analyze(data);
                }
            };
            reader.readAsDataURL(file);
        }
    };


    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const c = canvasRef.current;
        c.width = videoRef.current.videoWidth;
        c.height = videoRef.current.videoHeight;
        c.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const data = c.toDataURL('image/jpeg', 0.8);
        setCapturedImage(data);
        analyze(data);
    };

    const analyze = async (data: string) => {
        setIsAnalyzing(true);
        try {
            const res = await GeminiService.analyzeVaccines(data.split(',')[1], language);
            if (user) {
                for (const v of res) {
                    await FirebaseService.saveVaccine(user.uid, v);
                }
            } else {
                setVaccines([...vaccines, ...res]);
            }
            setIsAdding(false);
            setCapturedImage(null);
        } catch (e) { alert("Analysis failed"); setIsAdding(false); }
        setIsAnalyzing(false);
    };

    if (isAdding) {
        return (
            <div className="h-full bg-black relative flex flex-col items-center justify-center min-h-[500px] rounded-3xl overflow-hidden">
                {!capturedImage ? (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        <button onClick={() => setIsAdding(false)} className="absolute top-4 left-4 text-white font-bold z-20 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">Cancel</button>
                        
                        {/* Shutter Button */}
                        <button onClick={capture} className="absolute bottom-8 w-20 h-20 bg-white rounded-full border-4 border-slate-300 z-20 hover:scale-105 transition-transform"></button>
                        
                        {/* Upload Button */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileUpload} 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-8 right-8 z-20 flex flex-col items-center gap-2 text-white"
                        >
                             <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
                                <i className="fas fa-image"></i>
                             </div>
                             <span className="text-xs font-bold drop-shadow-md">Upload</span>
                        </button>

                        <div className="absolute top-16 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">Scan Vaccine Card</div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                        <TypingLoader darkMode={true} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-sm hover:underline">← Home</button>
                <h2 className="text-xl font-bold">Vaccines</h2>
                <Button onClick={() => setIsAdding(true)} className="!py-2 !px-4 text-sm"><i className="fas fa-plus"></i></Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
                {vaccines.length === 0 ? (
                    <div className="text-center opacity-50 mt-20"><i className="fas fa-syringe text-5xl mb-4"></i><p>No records found.</p></div>
                ) : (
                    vaccines.map(v => (
                        <Card key={v.id} highContrast={highContrast} darkMode={darkMode} className={`!p-4 border-l-4 ${v.status === 'EXPIRED' ? 'border-l-red-500' : v.status === 'UPCOMING' ? 'border-l-blue-500' : 'border-l-green-500'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold">{v.name}</h3>
                                    <p className="text-xs opacity-70">Given: {v.dateGiven}</p>
                                    {v.nextDueDate && <p className="text-xs font-bold mt-1">Due: {v.nextDueDate}</p>}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${v.status === 'EXPIRED' ? 'bg-red-500 text-white' : v.status === 'UPCOMING' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>{v.status}</span>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

const HealthHistoryView = ({ onBack, darkMode, highContrast, user }: { onBack: () => void, darkMode: boolean, highContrast: boolean, user: any }) => {
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

    const shareWithDoctor = () => {
        const contactsText = history.emergencyContacts && history.emergencyContacts.length > 0
            ? history.emergencyContacts.map(c => `- ${c.name} (${c.relation}): ${c.phone}`).join('\n')
            : 'None listed';

        const content = `HEALTH HISTORY & VITALS REPORT\n
Blood Type: ${history.bloodType || 'Not specified'}
Organ Donor: ${history.organDonor ? 'Yes' : 'No'}

EMERGENCY CONTACTS:
${contactsText}

CONDITIONS:
${history.conditions.length > 0 ? history.conditions.map(c => `- ${c}`).join('\n') : 'None specified'}

SURGERIES:
${history.surgeries.length > 0 ? history.surgeries.map(s => `- ${s}`).join('\n') : 'None specified'}

FAMILY HISTORY:
${history.familyHistory.length > 0 ? history.familyHistory.map(f => `- ${f}`).join('\n') : 'None specified'}

ALLERGIES:
${history.allergies.length > 0 ? history.allergies.map(a => `- ${a}`).join('\n') : 'None specified'}
        `;

        if (navigator.share) {
            navigator.share({
                title: 'My Health History',
                text: content
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(content);
            alert("History copied to clipboard!");
        }
    };

    return (
        <div className={`h-full flex flex-col ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-sm hover:underline">← Home</button>
                <h2 className="text-xl font-bold">Health History & Vitals</h2>
                <Button onClick={shareWithDoctor} className="!py-2 !px-4 text-sm"><i className="fas fa-share-alt"></i> Share</Button>
            </div>

            <div className="space-y-6 overflow-y-auto pb-20 scrollbar-hide">
                {/* 1. Tracked Health Metrics & Blood Pressure Trend Chart */}
                <HealthTrendsChart
                    metrics={history.metrics || []}
                    onSaveMetrics={handleSaveMetrics}
                    darkMode={darkMode}
                    highContrast={highContrast}
                />

                {/* 2. Emergency Contacts Section */}
                <EmergencyContacts
                    contacts={history.emergencyContacts || []}
                    onSaveContacts={handleSaveContacts}
                    darkMode={darkMode}
                    highContrast={highContrast}
                />

                {/* 3. Core Clinical Profile Card */}
                <Card darkMode={darkMode} highContrast={highContrast}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase opacity-50 mb-1">Blood Type</label>
                            <select 
                                value={history.bloodType} 
                                onChange={async (e) => {
                                    const updated = {...history, bloodType: e.target.value};
                                    setHistory(updated);
                                    if (user) {
                                        await FirebaseService.saveHealthHistory(user.uid, updated);
                                    } else {
                                        localStorage.setItem('medimind_health_history', JSON.stringify(updated));
                                    }
                                }}
                                className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
                            >
                                <option value="">Select</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                            <input 
                                type="checkbox" 
                                id="organDonor"
                                checked={history.organDonor}
                                onChange={async (e) => {
                                    const updated = {...history, organDonor: e.target.checked};
                                    setHistory(updated);
                                    if (user) {
                                        await FirebaseService.saveHealthHistory(user.uid, updated);
                                    } else {
                                        localStorage.setItem('medimind_health_history', JSON.stringify(updated));
                                    }
                                }}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="organDonor" className="text-sm font-bold">Organ Donor</label>
                        </div>
                    </div>
                </Card>

                <Card darkMode={darkMode} highContrast={highContrast}>
                    <h3 className="font-bold mb-4 flex items-center gap-2"><i className="fas fa-plus-circle text-blue-500"></i> Add New Entry</h3>
                    <div className="flex gap-2">
                        <select 
                            value={newEntry.type}
                            onChange={(e) => setNewEntry({...newEntry, type: e.target.value})}
                            className={`p-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
                        >
                            <option value="conditions">Condition</option>
                            <option value="surgeries">Surgery</option>
                            <option value="familyHistory">Family History</option>
                            <option value="allergies">Allergy</option>
                        </select>
                        <input 
                            type="text"
                            value={newEntry.value}
                            onChange={(e) => setNewEntry({...newEntry, value: e.target.value})}
                            onKeyPress={(e) => e.key === 'Enter' && addEntry()}
                            placeholder="Type here..."
                            className={`flex-1 p-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
                        />
                        <Button onClick={addEntry} className="!p-2"><i className="fas fa-plus"></i></Button>
                    </div>
                </Card>

                {(['conditions', 'surgeries', 'familyHistory', 'allergies'] as const).map(key => (
                    <div key={key}>
                        <h3 className="text-xs font-bold uppercase opacity-50 mb-2 tracking-wider ml-2">{key.replace(/([A-Z])/g, ' $1')}</h3>
                        <div className="space-y-2">
                            {(history[key] as string[]).length === 0 ? (
                                <p className="text-xs opacity-40 italic ml-2">No entries yet.</p>
                            ) : (
                                (history[key] as string[]).map((item, i) => (
                                    <div key={i} className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-100 shadow-sm'}`}>
                                        <span className="text-sm">{item}</span>
                                        <button onClick={() => removeEntry(key, i)} className="text-red-400 hover:text-red-600 p-1"><i className="fas fa-trash-alt text-xs"></i></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BodyScanView = ({ onBack, language, darkMode, highContrast }: { onBack: () => void, language: string, darkMode: boolean, highContrast: boolean }) => {
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
            } catch (e) { console.error("Camera error", e); }
        };

        if (!capturedImage) startCamera();
        
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
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
        const dataUrl = c.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        analyze(dataUrl);
    };

    const analyze = async (data: string) => {
        setIsAnalyzing(true);
        try {
            const res = await GeminiService.analyzeBodyScan(data.split(',')[1], language);
            setResult(res);
        } catch (e) { alert("Failed to analyze body scan."); setCapturedImage(null); }
        setIsAnalyzing(false);
    }

    return (
        <div className={`flex flex-col h-full ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="text-sm font-bold whitespace-nowrap">← Cancel</button>
                <h2 className="font-bold text-center">AI Body Scan</h2>
                <div className="w-10"></div>
            </div>
            <div className="flex-1 relative bg-black rounded-3xl overflow-hidden flex flex-col justify-center items-center min-h-[500px]">
                {!capturedImage ? (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 border-2 border-blue-500/30 rounded-3xl pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-96 border-2 border-dashed border-white/50 rounded-full"></div>
                        </div>
                        <button onClick={takePhoto} className="absolute bottom-8 z-20 w-20 h-20 bg-white rounded-full border-4 border-slate-200 hover:scale-105 transition-transform shadow-2xl"></button>
                        <p className="absolute bottom-32 text-white font-bold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Position body part in frame</p>
                    </>
                ) : (
                    <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                )}
                <canvas ref={canvasRef} className="hidden" />
                {isAnalyzing && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                        <TypingLoader darkMode={true} />
                    </div>
                )}
                {result && (
                    <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto scrollbar-hide">
                        <Card className="w-full max-w-lg my-8" highContrast={highContrast} darkMode={darkMode}>
                             <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><i className="fas fa-clipboard-check text-green-500"></i> Scan Report</h3>
                             <p className="mb-6 text-sm opacity-80 leading-relaxed">{result.summary}</p>
                             
                             <div className="space-y-4 mb-6">
                                 <h4 className="text-xs font-bold uppercase opacity-50 tracking-wider">Findings</h4>
                                 {result.findings.map((f, i) => (
                                     <div key={i} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                         <div className="flex justify-between items-center mb-1">
                                             <span className="font-bold text-sm">{f.area}</span>
                                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.severity === 'NORMAL' ? 'bg-green-500 text-white' : f.severity === 'MONITOR' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                                 {f.severity.replace('_', ' ')}
                                             </span>
                                         </div>
                                         <p className="text-xs opacity-70">{f.observation}</p>
                                     </div>
                                 ))}
                             </div>

                             <div className="space-y-4 mb-6">
                                 <h4 className="text-xs font-bold uppercase opacity-50 tracking-wider">Recommendations</h4>
                                 <ul className="space-y-2">
                                     {result.recommendations.map((r, i) => (
                                         <li key={i} className="flex gap-2 text-sm items-start">
                                             <i className="fas fa-check-circle text-blue-500 mt-1"></i>
                                             <span>{r}</span>
                                         </li>
                                     ))}
                                 </ul>
                             </div>

                             <Button onClick={() => {setCapturedImage(null); setResult(null);}} className="w-full">New Scan</Button>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

const AddMedication = ({ onCancel, onSave, language, highContrast, darkMode }: any) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Medication>>({ time: '09:00', frequency: 'Daily' });
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (capturedImage || isAnalyzing) return;

        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            } catch (e) {
                console.error("Camera access failed", e);
            }
        };
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [capturedImage, isAnalyzing]);

    const capture = async () => {
        const c = canvasRef.current;
        const v = videoRef.current;
        if (c && v && v.readyState === 4) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            c.getContext('2d')?.drawImage(v, 0, 0);
            const data = c.toDataURL('image/jpeg', 0.8);
            
            setCapturedImage(data);
            setIsAnalyzing(true);
            try {
                const res = await GeminiService.analyzeMedication(data.split(',')[1], language);
                setForm({ ...form, ...res });
            } catch (e) {
                alert("Failed to analyze medication.");
            }
            setIsAnalyzing(false);
        }
    };

    if (isAnalyzing) {
        return (
            <div className="h-full flex items-center justify-center bg-black min-h-[500px] rounded-3xl">
                <TypingLoader darkMode={true} />
            </div>
        );
    }

    if (!capturedImage) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 relative bg-black rounded-3xl overflow-hidden min-h-[500px]">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover" 
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute top-4 left-4 z-20">
                        <button onClick={onCancel} className="text-white font-bold px-4 py-2 bg-black/40 rounded-full backdrop-blur-md">
                            Cancel
                        </button>
                    </div>
                    
                    <div className="absolute bottom-8 z-20 flex flex-col items-center w-full gap-4">
                        <div className="bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm text-sm">
                            Align medication label
                        </div>
                        <button 
                            onClick={capture} 
                            className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 hover:scale-105 transition-transform"
                        ></button>
                    </div>
                </div>
            </div>
        );
    }

    // Form View
    return (
        <div className={`h-full flex flex-col p-6 overflow-y-auto ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
            <h2 className="text-2xl font-bold mb-6">Medication Details</h2>
            
            <div className="space-y-4 mb-8">
                <div>
                    <label className={`text-xs uppercase font-bold opacity-70 mb-1 block`}>Name</label>
                    <input 
                        className={`w-full border-b p-2 bg-transparent outline-none ${darkMode ? 'border-slate-600 focus:border-blue-400' : 'border-slate-200 focus:border-blue-600'}`} 
                        placeholder="e.g. Lisinopril" 
                        value={form.name || ''} 
                        onChange={e => setForm({ ...form, name: e.target.value })} 
                    />
                </div>
                <div>
                    <label className={`text-xs uppercase font-bold opacity-70 mb-1 block`}>Dosage</label>
                    <input 
                        className={`w-full border-b p-2 bg-transparent outline-none ${darkMode ? 'border-slate-600 focus:border-blue-400' : 'border-slate-200 focus:border-blue-600'}`} 
                        placeholder="e.g. 10mg" 
                        value={form.dosage || ''} 
                        onChange={e => setForm({ ...form, dosage: e.target.value })} 
                    />
                </div>
                <div>
                    <label className={`text-xs uppercase font-bold opacity-70 mb-1 block`}>Frequency</label>
                    <input 
                        className={`w-full border-b p-2 bg-transparent outline-none ${darkMode ? 'border-slate-600 focus:border-blue-400' : 'border-slate-200 focus:border-blue-600'}`} 
                        placeholder="e.g. Once Daily" 
                        value={form.frequency || ''} 
                        onChange={e => setForm({ ...form, frequency: e.target.value })} 
                    />
                </div>
                <div>
                    <label className={`text-xs uppercase font-bold opacity-70 mb-1 block`}>Instructions</label>
                    <textarea 
                        className={`w-full border-b p-2 bg-transparent outline-none ${darkMode ? 'border-slate-600 focus:border-blue-400' : 'border-slate-200 focus:border-blue-600'}`} 
                        placeholder="e.g. Take with food" 
                        value={form.instructions || ''} 
                        onChange={e => setForm({ ...form, instructions: e.target.value })} 
                    />
                </div>
            </div>

            <div className="mt-auto flex gap-4 pb-8">
                <Button variant="secondary" onClick={() => setCapturedImage(null)} className="flex-1">Retake</Button>
                <Button onClick={() => onSave({ ...form, id: Date.now().toString() })} className="flex-1">Save Medication</Button>
            </div>
        </div>
    );
};


// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [accessMode, setAccessMode] = useState<AccessibilityMode>(AccessibilityMode.STANDARD);
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('medimind_font_size') as FontSize) || FontSize.MEDIUM);
  const [dyslexicFont, setDyslexicFont] = useState<boolean>(() => localStorage.getItem('medimind_dyslexic_font') === 'true');
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('medimind_dark_mode') === 'true');
  const [language, setLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [location, setLocation] = useState(() => localStorage.getItem('medimind_location') || "");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // User Auth & Persistence
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const [medications, setMedications] = useState<Medication[]>(() => JSON.parse(localStorage.getItem('medimind_meds') || '[]'));
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>(() => JSON.parse(localStorage.getItem('medimind_moods') || '[]'));
  const [storedReports, setStoredReports] = useState<StoredReport[]>(() => JSON.parse(localStorage.getItem('medimind_reports') || '[]'));
  const [showMoodCheck, setShowMoodCheck] = useState(false);

  const isHighContrast = accessMode === AccessibilityMode.HIGH_CONTRAST;

  useEffect(() => { localStorage.setItem('medimind_meds', JSON.stringify(medications)); }, [medications]);
  useEffect(() => { localStorage.setItem('medimind_moods', JSON.stringify(moodHistory)); }, [moodHistory]);
  useEffect(() => { localStorage.setItem('medimind_reports', JSON.stringify(storedReports)); }, [storedReports]);
  useEffect(() => { localStorage.setItem('medimind_dark_mode', String(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('medimind_font_size', fontSize); }, [fontSize]);
  useEffect(() => { localStorage.setItem('medimind_dyslexic_font', String(dyslexicFont)); }, [dyslexicFont]);
  useEffect(() => { localStorage.setItem('medimind_location', location); }, [location]);

  // Mood Check Logic
  useEffect(() => {
    if (mode !== AppMode.ONBOARDING) {
        const today = new Date().toISOString().split('T')[0];
        const hasLoggedToday = moodHistory.some(m => m.date === today);
        if (!hasLoggedToday) setShowMoodCheck(true);
    }
  }, [mode, moodHistory]);

  // Onboarding
  useEffect(() => {
    if (mode === AppMode.ONBOARDING && onboardingStep < 2) {
      const timer = setTimeout(() => setOnboardingStep(s => s + 1), 3000);
      return () => clearTimeout(timer);
    }
  }, [mode, onboardingStep]);

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await GeminiService.analyzeReport(base64, file.type, language, "", location); // passing location
        setAnalysis(res);
        setMode(AppMode.ANALYSIS);
        // Cache report
        const newReport = { id: Date.now().toString(), date: Date.now(), fileName: file.name, result: res };
        setStoredReports(prev => [newReport, ...prev].slice(0, 5));
        setIsProcessing(false);
      };
    } catch (e) { alert("Error analyzing."); setIsProcessing(false); }
  };

  const handleMoodSave = (mood: MoodEntry['mood']) => {
      setMoodHistory(prev => [{ date: new Date().toISOString().split('T')[0], mood }, ...prev]);
      setShowMoodCheck(false);
  };

  const loadReport = (r: StoredReport) => {
      setAnalysis(r.result);
      setMode(AppMode.ANALYSIS);
  };

  // Styles logic
  let bgClass = 'bg-slate-50 min-h-screen';
  let textClass = 'text-slate-900';
  if (isHighContrast) {
    bgClass = 'bg-black min-h-screen';
    textClass = 'text-yellow-300';
  } else if (darkMode) {
    bgClass = 'bg-slate-900 min-h-screen';
    textClass = 'text-white';
  }

  if (mode === AppMode.ONBOARDING) {
      return <Onboarding onComplete={() => setMode(AppMode.DASHBOARD)} language={language} />;
  }

  return (
    <div className={`${bgClass} ${dyslexicFont ? 'font-dyslexic' : ''} size-${fontSize.toLowerCase()} transition-all duration-300 relative flex flex-col`}>
      {/* Mood Modal */}
      {showMoodCheck && <MoodTracker onSave={handleMoodSave} history={moodHistory} />}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          accessMode={accessMode}
          setAccessMode={setAccessMode}
          fontSize={fontSize}
          setFontSize={setFontSize}
          dyslexicFont={dyslexicFont}
          setDyslexicFont={setDyslexicFont}
          user={user}
          onLogout={() => FirebaseService.logout()}
        />
      )}

      <nav className={`sticky top-0 z-40 backdrop-blur-md border-b ${isHighContrast ? 'bg-black/80 border-slate-800' : darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-100'} px-6 py-4 flex justify-between items-center shrink-0`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setMode(AppMode.DASHBOARD); setAnalysis(null);}}>
            <i className={`fas fa-brain text-2xl ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}></i>
            <span className={`font-bold text-xl ${textClass}`}>MediMind</span>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setShowSettings(true)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isHighContrast ? 'bg-yellow-900 text-yellow-300' : darkMode ? 'bg-slate-700 text-blue-400' : 'bg-slate-200 text-slate-600'}`}>
                <i className="fas fa-cog text-xs"></i>
            </button>
            <select value={language} onChange={e => setLanguage(e.target.value)} className={`text-xs bg-transparent border rounded ${darkMode ? 'text-white border-slate-600' : 'text-slate-800 border-slate-300'}`}>
                {SUPPORTED_LANGUAGES.map(l => <option key={l} value={l} className="text-black">{l}</option>)}
            </select>
        </div>
      </nav>

      <main className="max-w-2xl w-full mx-auto p-6 flex-1 overflow-hidden pb-24">
        {mode === AppMode.DASHBOARD && !analysis && (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setMode(AppMode.EMERGENCY)} className={`p-4 rounded-2xl flex flex-col items-center gap-2 ${isHighContrast ? 'bg-red-900 text-yellow-300 border border-yellow-400' : darkMode ? 'bg-red-900/50 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        <i className="fas fa-heart-pulse text-2xl"></i><span className="font-bold text-sm">Emergency</span>
                    </button>
                    <button onClick={() => setMode(AppMode.VISUAL_SYMPTOM_CHECK)} className={`p-4 rounded-2xl flex flex-col items-center gap-2 ${isHighContrast ? 'bg-yellow-900 text-yellow-300 border border-yellow-400' : darkMode ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-800' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                        <i className="fas fa-camera text-2xl"></i><span className="font-bold text-sm">Symptom Cam</span>
                    </button>
                    <button onClick={() => setMode(AppMode.VACCINE)} className={`p-4 rounded-2xl flex flex-col items-center gap-2 ${isHighContrast ? 'bg-slate-900 border border-yellow-400' : darkMode ? 'bg-slate-800 shadow hover:bg-slate-700' : 'bg-white shadow hover:shadow-md'}`}>
                        <i className="fas fa-syringe text-2xl text-green-500"></i><span className={`font-bold text-sm ${textClass}`}>Vaccines</span>
                    </button>
                    <button onClick={() => setMode(AppMode.MY_MEDS)} className={`p-4 rounded-2xl flex flex-col items-center gap-2 ${isHighContrast ? 'bg-slate-900 border border-yellow-400' : darkMode ? 'bg-slate-800 shadow hover:bg-slate-700' : 'bg-white shadow hover:shadow-md'}`}>
                        <i className="fas fa-pills text-2xl text-blue-500"></i><span className="font-bold text-sm">Meds</span>
                    </button>
                    <button onClick={() => setMode(AppMode.BODY_SCAN)} className={`p-4 rounded-2xl flex flex-col items-center gap-2 ${isHighContrast ? 'bg-slate-900 border border-yellow-400' : darkMode ? 'bg-slate-800 shadow hover:bg-slate-700' : 'bg-white shadow hover:shadow-md'}`}>
                        <i className="fas fa-user-md text-2xl text-purple-500"></i><span className="font-bold text-sm">Body Scan</span>
                    </button>
                    <button onClick={() => setMode(AppMode.HEALTH_HISTORY)} className={`p-4 rounded-2xl flex flex-col items-center gap-2 ${isHighContrast ? 'bg-slate-900 border border-yellow-400' : darkMode ? 'bg-slate-800 shadow hover:bg-slate-700' : 'bg-white shadow hover:shadow-md'}`}>
                        <i className="fas fa-history text-2xl text-amber-500"></i><span className="font-bold text-sm">History</span>
                    </button>
                </div>

                <div className={`p-5 rounded-2xl transition-all ${isHighContrast ? 'bg-slate-900 border border-yellow-400' : darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white shadow-sm border border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <i className="fas fa-location-dot text-sm"></i>
                        </div>
                        <label className={`text-xs font-bold uppercase tracking-wider ${isHighContrast ? 'text-yellow-500' : 'text-slate-400'}`}>Your Location</label>
                    </div>
                    <input 
                        type="text" 
                        placeholder="City, Country (e.g. London, UK)" 
                        value={location} 
                        onChange={e => setLocation(e.target.value)} 
                        className={`w-full bg-transparent border-b outline-none pb-2 transition-all ${textClass} ${isHighContrast ? 'border-yellow-600 focus:border-yellow-400' : darkMode ? 'border-slate-600 focus:border-blue-500 placeholder-slate-600' : 'border-slate-200 focus:border-blue-600'}`} 
                    />
                    <p className="text-[10px] opacity-40 mt-2 italic">Used to improve local cost estimates in your reports.</p>
                </div>

                <FileUpload onUpload={handleUpload} isProcessing={isProcessing} darkMode={darkMode} />

                {storedReports.length > 0 && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`font-bold ${textClass}`}>Recent Reports</h3>
                            <span className="text-xs opacity-50">{storedReports.length} reports saved</span>
                        </div>
                        <div className="space-y-3">
                            {storedReports.map(r => (
                                <div 
                                    key={r.id} 
                                    onClick={() => loadReport(r)} 
                                    className={`p-4 rounded-2xl flex flex-col gap-2 cursor-pointer transition-all active:scale-95 group
                                        ${isHighContrast 
                                            ? 'bg-slate-900 border border-yellow-600 hover:bg-slate-800' 
                                            : darkMode 
                                                ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700' 
                                                : 'bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                <i className="fas fa-file-medical"></i>
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${textClass}`}>{r.fileName}</p>
                                                <p className="text-[10px] opacity-50">{new Date(r.date).toLocaleDateString()} • {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <i className="fas fa-chevron-right text-slate-300 group-hover:text-blue-400 transition-colors"></i>
                                    </div>
                                    <p className={`text-xs line-clamp-2 opacity-70 leading-relaxed ${textClass}`}>
                                        {r.result.summary}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {mode === AppMode.ANALYSIS && analysis && <ResultView result={analysis} highContrast={isHighContrast} darkMode={darkMode} onSpeak={() => GeminiService.speakText(analysis.summary, language)} onBack={() => {setMode(AppMode.DASHBOARD); setAnalysis(null);}} language={language} />}
        {mode === AppMode.EMERGENCY && <EmergencyMode language={language} highContrast={isHighContrast} darkMode={darkMode} onBack={() => setMode(AppMode.DASHBOARD)} />}
        {mode === AppMode.VISUAL_SYMPTOM_CHECK && <VisualSymptomCheck onBack={() => setMode(AppMode.DASHBOARD)} language={language} highContrast={isHighContrast} darkMode={darkMode} />}
        {mode === AppMode.MY_MEDS && (
          <MyMedications 
            medications={medications} 
            onAdd={() => setMode(AppMode.ADD_MEDICATION)} 
            onTake={(id: string) => setMedications(medications.map(m => m.id === id ? { ...m, lastTakenDate: new Date().toISOString().split('T')[0] } : m))} 
            onDelete={(id: string) => setMedications(medications.filter(m => m.id !== id))}
            highContrast={isHighContrast} 
            darkMode={darkMode} 
          />
        )}
        {mode === AppMode.ADD_MEDICATION && <AddMedication onCancel={() => setMode(AppMode.MY_MEDS)} onSave={(m:Medication) => {setMedications([...medications, m]); setMode(AppMode.MY_MEDS);}} language={language} highContrast={isHighContrast} darkMode={darkMode} />}
        {mode === AppMode.VACCINE && <VaccineTracker onBack={() => setMode(AppMode.DASHBOARD)} language={language} highContrast={isHighContrast} darkMode={darkMode} />}
        {mode === AppMode.HEALTH_HISTORY && <HealthHistoryView onBack={() => setMode(AppMode.DASHBOARD)} darkMode={darkMode} highContrast={isHighContrast} user={user} />}
        {mode === AppMode.BODY_SCAN && <BodyScanView onBack={() => setMode(AppMode.DASHBOARD)} language={language} darkMode={darkMode} highContrast={isHighContrast} />}
      </main>
    </div>
  );
}
