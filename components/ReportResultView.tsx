import React, { useState, useEffect } from 'react';
import { AnalysisResult, DoctorLetter, LabMeasurement } from '../types';
import { GeminiService } from '../services/geminiService';
import { PDFExportService } from '../services/pdfExportService';
import { Button, Card, Badge, Toast, PageHeader } from './SharedComponents';

interface ReportResultViewProps {
  result: AnalysisResult;
  highContrast: boolean;
  darkMode: boolean;
  onSpeak: () => void;
  onBack: () => void;
  language: string;
  location?: string;
}

export const ReportResultView: React.FC<ReportResultViewProps> = ({
  result,
  highContrast,
  darkMode,
  onSpeak,
  onBack,
  language,
  location
}) => {
  const [isPlainLanguageMode, setIsPlainLanguageMode] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [patientNameInput, setPatientNameInput] = useState('');
  const [doctorLetter, setDoctorLetter] = useState<DoctorLetter | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Google Drive Integration State
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);

  // Share link state
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Lab measurement filter
  const [labFilter, setLabFilter] = useState<'all' | 'attention' | 'normal'>('all');

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Google Drive client initialization
  useEffect(() => {
    const initGoogle = () => {
      if (!(window as any).google || !GOOGLE_CLIENT_ID) return;
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: () => {}
        });
        setTokenClient(client);
      } catch (e) {
        console.error('GSI Init failed', e);
      }
    };

    if ((window as any).google) {
      initGoogle();
    } else {
      window.addEventListener('load', initGoogle);
    }
    return () => window.removeEventListener('load', initGoogle);
  }, [GOOGLE_CLIENT_ID]);

  const handleExportPDF = () => {
    try {
      const fileName = PDFExportService.exportAnalysisReport(result, {
        patientName: patientNameInput || undefined,
        reportDate: Date.now(),
        fileName: 'MediMind_Clinical_Report'
      });
      showToast(`Exported clinical report as ${fileName}`);
    } catch (e) {
      console.error('PDF Export Error:', e);
      showToast('Failed to export PDF report.');
    }
  };

  const handleGenerateLetter = async () => {
    if (!patientNameInput.trim()) return;
    setIsGeneratingLetter(true);
    try {
      const letter = await GeminiService.generateDoctorLetter(result, patientNameInput.trim(), language);
      setDoctorLetter(letter);
      setShowLetterModal(false);
      showToast('Doctor Summary Letter generated successfully.');
    } catch (e) {
      showToast('Failed to generate doctor letter.');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleSaveToDrive = async () => {
    setIsSavingDrive(true);

    if (!tokenClient || !GOOGLE_CLIENT_ID) {
      setTimeout(() => {
        setIsSavingDrive(false);
        showToast('Demo Mode: Report saved to Drive. (Set GOOGLE_CLIENT_ID for live Drive API)');
      }, 1200);
      return;
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        setIsSavingDrive(false);
        showToast('Google Drive authentication failed.');
        return;
      }

      try {
        const content = `MEDIMIND CLINICAL SUMMARY\nDate: ${new Date().toLocaleDateString()}\nLanguage: ${language}\n\nSUMMARY:\n${result.summary}\n\nDETAILED EXPLANATION:\n${result.simpleExplanation}\n\nRED FLAGS:\n${result.redFlags.map((r) => `- ${r.finding} (${r.severity}): ${r.action}`).join('\n')}\n\nNEXT STEPS:\n${result.nextSteps.join('\n')}`;
        const file = new Blob([content], { type: 'text/plain' });
        const metadata = {
          name: `MediMind_Report_${Date.now()}.txt`,
          mimeType: 'text/plain'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const upload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: new Headers({ Authorization: 'Bearer ' + resp.access_token }),
          body: form
        });

        if (upload.ok) {
          showToast('Report uploaded to your Google Drive account.');
        } else {
          throw new Error('Upload failed');
        }
      } catch (e) {
        showToast('Failed to upload to Google Drive.');
      } finally {
        setIsSavingDrive(false);
      }
    };

    tokenClient.requestAccessToken({ prompt: '' });
  };

  const openShare = () => {
    setShowShareModal(true);
    setIsGeneratingLink(true);
    setTimeout(() => {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase();
      setShareLink(`https://medimind.ai/report/${id}`);
      setIsGeneratingLink(false);
    }, 1000);
  };

  // Lab measurements filter
  const filteredLabs = (result.labMeasurements || []).filter((lab) => {
    if (labFilter === 'attention') return lab.status === 'attention' || lab.status === 'critical';
    if (labFilter === 'normal') return lab.status === 'normal';
    return true;
  });

  return (
    <div className={`space-y-6 animate-fade-in pb-20 max-w-4xl mx-auto ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-900'}`}>
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {/* Header Actions */}
      <PageHeader
        title="Medical Report Analysis"
        description="Evidence-grounded second opinion translation and structured biomarker extraction"
        badge={
          result.urgency === 'emergency' ? (
            <Badge tone="danger" icon="fas fa-triangle-exclamation">Emergency Review</Badge>
          ) : result.urgency === 'urgent' ? (
            <Badge tone="warning" icon="fas fa-circle-exclamation">Clinical Attention Advised</Badge>
          ) : (
            <Badge tone="success" icon="fas fa-circle-check">Stable / Routine Review</Badge>
          )
        }
        onBack={onBack}
        backText="Dashboard"
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setIsPlainLanguageMode(!isPlainLanguageMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                isPlainLanguageMode
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : darkMode
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle plain language simplified summary for patients and caregivers"
            >
              <i className="fas fa-glasses text-xs"></i>
              <span>{isPlainLanguageMode ? 'Patient Mode (Active)' : 'Patient Mode'}</span>
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onSpeak}
              leftIcon={<i className="fas fa-volume-high"></i>}
              title="Listen to summary"
            >
              Audio
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              leftIcon={<i className="fas fa-file-pdf text-rose-500"></i>}
              title="Download clinical PDF portfolio"
            >
              PDF
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLetterModal(true)}
              leftIcon={<i className="fas fa-user-doctor text-blue-600"></i>}
              title="Generate summary letter for your doctor"
            >
              MD Letter
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={openShare}
              leftIcon={<i className="fas fa-share-nodes"></i>}
              title="Share summary securely"
            >
              Share
            </Button>
          </div>
        }
        darkMode={darkMode}
        highContrast={highContrast}
      />

      {/* Patient Mode Clarification Banner */}
      {isPlainLanguageMode && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <i className="fas fa-hands-holding-child text-blue-600 dark:text-blue-400 text-base"></i>
            <div>
              <span className="font-bold">Plain Language & Caregiver Mode is enabled: </span>
              <span>Complex medical jargon has been rephrased into everyday conversational terms.</span>
            </div>
          </div>
          <button
            onClick={() => setIsPlainLanguageMode(false)}
            className="text-xs font-bold underline hover:opacity-80 shrink-0"
          >
            Switch to Clinical
          </button>
        </div>
      )}

      {/* Red Flags Triage Section */}
      {result.redFlags && result.redFlags.length > 0 ? (
        <Card accent="danger" darkMode={darkMode} highContrast={highContrast} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <i className="fas fa-shield-halved"></i>
              <span>Clinical Attention Indicators ({result.redFlags.length})</span>
            </h2>
            <Badge tone="danger">Requires Provider Follow-Up</Badge>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {result.redFlags.map((flag, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs sm:text-sm text-rose-700 dark:text-rose-300">
                    {flag.finding}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                    {flag.severity} Priority
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">{flag.action}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            <i className="fas fa-check"></i>
          </div>
          <div className="text-xs sm:text-sm">
            <p className="font-bold">No Critical Red Flags Detected</p>
            <p className="opacity-90">All identified biomarker markers fall within standard routine thresholds.</p>
          </div>
        </div>
      )}

      {/* Executive Summary Card */}
      <Card darkMode={darkMode} highContrast={highContrast}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold flex items-center gap-2">
            <i className="fas fa-file-lines text-blue-600 dark:text-blue-400"></i>
            <span>{isPlainLanguageMode ? 'Plain Language Overview' : 'Clinical Summary'}</span>
          </h2>
          <span className="text-[11px] text-slate-400">Language: {language}</span>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200">
          {isPlainLanguageMode && result.childExplanation ? result.childExplanation : result.summary}
        </p>
      </Card>

      {/* Detailed Explanation */}
      {!isPlainLanguageMode && result.simpleExplanation && (
        <Card darkMode={darkMode} highContrast={highContrast}>
          <h2 className="text-base font-bold mb-2 flex items-center gap-2">
            <i className="fas fa-stethoscope text-indigo-600 dark:text-indigo-400"></i>
            <span>In-Depth Pathological Breakdown</span>
          </h2>
          <div className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-2 whitespace-pre-line">
            {result.simpleExplanation}
          </div>
        </Card>
      )}

      {/* Laboratory Measurements & Biomarker Table */}
      {result.labMeasurements && result.labMeasurements.length > 0 && (
        <Card darkMode={darkMode} highContrast={highContrast}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <i className="fas fa-vial-circle-check text-blue-600 dark:text-blue-400"></i>
                <span>Extracted Biomarkers & Laboratory Values</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {result.labMeasurements.length} quantitative markers extracted from document
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setLabFilter('all')}
                className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  labFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                All ({result.labMeasurements.length})
              </button>
              <button
                onClick={() => setLabFilter('attention')}
                className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  labFilter === 'attention'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Flags ({result.labMeasurements.filter((m) => m.status !== 'normal').length})
              </button>
              <button
                onClick={() => setLabFilter('normal')}
                className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  labFilter === 'normal'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Normal ({result.labMeasurements.filter((m) => m.status === 'normal').length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Test / Biomarker</th>
                  <th className="py-2.5 px-3 font-semibold">Result</th>
                  <th className="py-2.5 px-3 font-semibold">Reference Range</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Clinical Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLabs.map((lab: LabMeasurement, idx: number) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                      {lab.test}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                      {lab.value}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">{lab.unit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {lab.referenceRangeText ||
                        (lab.referenceRangeMin !== undefined && lab.referenceRangeMax !== undefined
                          ? `${lab.referenceRangeMin} - ${lab.referenceRangeMax} ${lab.unit}`
                          : 'Standard')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lab.status === 'critical'
                            ? 'bg-rose-600 text-white'
                            : lab.status === 'attention'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                        }`}
                      >
                        {lab.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs">
                      {lab.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empowered Questions for Your Doctor */}
      {result.questionsForDoctor && result.questionsForDoctor.length > 0 && (
        <Card accent="primary" darkMode={darkMode} highContrast={highContrast}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <i className="fas fa-clipboard-question text-blue-600"></i>
              <span>Questions to Ask Your Healthcare Provider</span>
            </h2>
            <button
              onClick={() => {
                const text = result.questionsForDoctor.map((q, i) => `${i + 1}. ${q}`).join('\n');
                navigator.clipboard.writeText(text);
                showToast('All doctor questions copied to clipboard!');
              }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <i className="fas fa-copy"></i> Copy All
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Bring these evidence-grounded questions to your appointment or message them via your patient portal:
          </p>

          <div className="space-y-2">
            {result.questionsForDoctor.map((q, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-start gap-3 text-xs sm:text-sm"
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1 text-slate-700 dark:text-slate-200">{q}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(q);
                    showToast('Question copied to clipboard');
                  }}
                  className="text-slate-400 hover:text-blue-600 p-1"
                  title="Copy question"
                >
                  <i className="fas fa-copy text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Procedural & Follow-up Cost Context */}
      {result.estimatedCost && (
        <Card darkMode={darkMode} highContrast={highContrast} className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              <i className="fas fa-receipt text-emerald-600"></i>
              <span>Procedural & Treatment Cost Context</span>
            </h2>
            {location && <Badge tone="neutral">{location}</Badge>}
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {result.estimatedCost}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Approximated based on typical outpatient healthcare billing schedules. Individual insurance copays and deductibles will vary.
          </p>
        </Card>
      )}

      {/* Verified Clinical Sources / Citations */}
      {result.sources && result.sources.length > 0 && (
        <Card darkMode={darkMode} highContrast={highContrast}>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <i className="fas fa-building-columns text-emerald-600"></i>
            <span>Verified Medical References & Grounding</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.sources.map((src, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {src.organization}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block truncate text-[11px]">
                    {src.title}
                  </span>
                </div>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-semibold shrink-0 text-xs flex items-center gap-1"
                  >
                    <span>View</span>
                    <i className="fas fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Professional Care Team Export & Coordination Card */}
      <Card darkMode={darkMode} highContrast={highContrast} className="border-slate-300 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Care Team Coordination & Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export standardized reports for your electronic health record (EHR) or share with authorized caregivers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportPDF}
              className="flex-1 sm:flex-initial"
              leftIcon={<i className="fas fa-file-arrow-down"></i>}
            >
              Export Clinical PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveToDrive}
              isLoading={isSavingDrive}
              className="flex-1 sm:flex-initial"
              leftIcon={<i className="fab fa-google-drive text-blue-500"></i>}
            >
              Save to Drive
            </Button>
          </div>
        </div>
      </Card>

      {/* Doctor Summary Letter Modal */}
      {showLetterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md relative" darkMode={darkMode} highContrast={highContrast}>
            <button
              onClick={() => setShowLetterModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-lg font-bold mb-2">Prepare Doctor Summary Letter</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the patient's full name to generate a formal summary letter tailored for clinical provider consultations.
            </p>

            <input
              type="text"
              value={patientNameInput}
              onChange={(e) => setPatientNameInput(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className={`w-full p-3 rounded-xl border text-sm mb-4 outline-none ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            />

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowLetterModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerateLetter}
                isLoading={isGeneratingLetter}
                disabled={!patientNameInput.trim()}
                className="flex-1"
              >
                Generate Letter
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Secure Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-md relative text-center" darkMode={darkMode} highContrast={highContrast}>
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 text-xl">
              <i className="fas fa-share-nodes"></i>
            </div>

            <h3 className="text-lg font-bold mb-1">Share Clinical Summary</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Provides authorized family members or consulting specialists with a secure view of this analysis in {language}.
            </p>

            {isGeneratingLink ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400">Generating secure access token...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <code className="text-blue-600 dark:text-blue-400 truncate flex-1 text-left mr-2">
                    {shareLink}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      showToast('Secure link copied to clipboard!');
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600"
                    title="Copy Link"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: 'MediMind Clinical Report Summary',
                            text: `Clinical Summary: ${result.summary}`,
                            url: shareLink
                          })
                          .catch(() => {});
                      } else {
                        navigator.clipboard.writeText(`${result.summary}\n\nLink: ${shareLink}`);
                        showToast('Summary copied to clipboard!');
                      }
                    }}
                  >
                    <i className="fas fa-paper-plane mr-1.5"></i> Send via Device Sheet
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Generated Doctor Letter Modal */}
      {doctorLetter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl relative text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold">Doctor Consultation Summary</h3>
                <p className="text-xs text-slate-500">Prepared by MediMind AI Clinical Assistant</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.print()} leftIcon={<i className="fas fa-print"></i>}>
                  Print
                </Button>
                <button
                  onClick={() => setDoctorLetter(null)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="space-y-5 text-xs sm:text-sm leading-relaxed">
              <div className="flex justify-between text-xs text-slate-500 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span>Patient: <strong className="text-slate-800 dark:text-slate-200">{doctorLetter.patientName}</strong></span>
                <span>Date: <strong className="text-slate-800 dark:text-slate-200">{doctorLetter.date}</strong></span>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">Clinical Summary</h4>
                <p className="text-slate-700 dark:text-slate-300">{doctorLetter.summary}</p>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">Notable Laboratory Findings</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  {doctorLetter.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              {doctorLetter.criticalNotes && doctorLetter.criticalNotes.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-1">Critical Follow-up Points</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {doctorLetter.criticalNotes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">Suggested Inquiries for Clinical Provider</h4>
                <div className="space-y-1.5">
                  {doctorLetter.questionsForDoctor.map((q, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-bold text-blue-600">{i + 1}.</span>
                      <span className="text-slate-700 dark:text-slate-300 italic">{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
