import React, { useRef, useState } from 'react';
import { Button, Card, Badge, ClinicalLoadingState } from './SharedComponents';

interface ReportUploadSectionProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
  darkMode: boolean;
  highContrast?: boolean;
}

export const ReportUploadSection: React.FC<ReportUploadSectionProps> = ({
  onUpload,
  isProcessing,
  darkMode,
  highContrast
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateAndSelect = (file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 25 * 1024 * 1024; // 25MB

    if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf')) {
      setErrorMessage('Please upload a PDF or an image document (JPEG, PNG).');
      return;
    }

    if (file.size > maxSize) {
      setErrorMessage('File size exceeds the 25MB maximum threshold.');
      return;
    }

    setSelectedFile(file);
    // Auto-trigger upload if user wants fast flow
    onUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  // Generate synthetic sample file for demo and quick exploration
  const handleLoadSample = (sampleType: 'cbc' | 'lipid' | 'metabolic') => {
    let sampleText = '';
    let fileName = '';

    if (sampleType === 'cbc') {
      fileName = 'Sample_Complete_Blood_Count_Panel.pdf';
      sampleText = `CLINICAL LABORATORY REPORT\nPatient: Jane Doe | DOB: 1984-05-12\nTest: Complete Blood Count (CBC) with Differential\n\nWBC: 12.4 x10^3/uL (Ref: 4.5 - 11.0) [HIGH]\nRBC: 4.2 x10^6/uL (Ref: 4.0 - 5.2) [NORMAL]\nHemoglobin: 11.2 g/dL (Ref: 12.0 - 15.5) [LOW]\nHematocrit: 34.0 % (Ref: 36.0 - 46.0) [LOW]\nPlatelets: 240 x10^3/uL (Ref: 150 - 450) [NORMAL]\nNeutrophils: 78 % (Ref: 45 - 70) [HIGH]\nLymphocytes: 16 % (Ref: 20 - 40) [LOW]\n\nNotes: Mild leukocytosis with relative neutrophilia. Mild microcytic anemia pattern noted.`;
    } else if (sampleType === 'lipid') {
      fileName = 'Sample_Lipid_Cardiovascular_Panel.pdf';
      sampleText = `CLINICAL LABORATORY REPORT\nPatient: John Smith | DOB: 1978-11-20\nTest: Comprehensive Lipid Profile\n\nTotal Cholesterol: 242 mg/dL (Ref: < 200) [HIGH]\nTriglycerides: 188 mg/dL (Ref: < 150) [HIGH]\nHDL Cholesterol: 38 mg/dL (Ref: > 40) [LOW]\nLDL Cholesterol: 166 mg/dL (Ref: < 100) [HIGH]\nCholesterol / HDL Ratio: 6.37 (Ref: < 5.0) [HIGH]\n\nNotes: Elevated atherogenic lipid profile. Dietary evaluation and lifestyle moderation advised.`;
    } else {
      fileName = 'Sample_Comprehensive_Metabolic_Panel.pdf';
      sampleText = `CLINICAL LABORATORY REPORT\nPatient: Alice Walker | DOB: 1969-02-14\nTest: Comprehensive Metabolic Panel (CMP)\n\nGlucose (Fasting): 134 mg/dL (Ref: 70 - 99) [HIGH]\nBUN: 18 mg/dL (Ref: 7 - 20) [NORMAL]\nCreatinine: 0.9 mg/dL (Ref: 0.6 - 1.2) [NORMAL]\neGFR: > 60 mL/min/1.73m2 (Ref: > 60) [NORMAL]\nSodium: 139 mmol/L (Ref: 136 - 145) [NORMAL]\nPotassium: 4.3 mmol/L (Ref: 3.5 - 5.1) [NORMAL]\nALT: 42 U/L (Ref: 7 - 35) [HIGH]\nAST: 36 U/L (Ref: 8 - 33) [HIGH]\n\nNotes: Elevated fasting blood glucose consistent with impaired fasting tolerance. Mild transaminase elevation.`;
    }

    const blob = new Blob([sampleText], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });
    setSelectedFile(file);
    onUpload(file);
  };

  if (isProcessing) {
    return (
      <Card darkMode={darkMode} highContrast={highContrast} className="border-blue-200 dark:border-blue-900">
        <ClinicalLoadingState
          stepText="Analyzing Clinical Document..."
          subText="Extracting biomarker values, detecting clinical red flags, and translating complex terminology."
          darkMode={darkMode}
        />
      </Card>
    );
  }

  return (
    <Card darkMode={darkMode} highContrast={highContrast} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <i className="fas fa-file-medical text-blue-600 dark:text-blue-400"></i>
            <span>Medical Document Intake</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload blood work, pathology summaries, radiological notes, or hospital discharge papers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="ai" icon="fas fa-shield-halved">Private & Encrypted</Badge>
        </div>
      </div>

      {/* Main Drag-and-Drop Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer select-none ${
          dragActive
            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 scale-[1.005]'
            : darkMode
            ? 'border-slate-700 hover:border-blue-500 hover:bg-slate-800/60 bg-slate-900/40'
            : 'border-slate-200 hover:border-blue-500 hover:bg-slate-50/80 bg-white'
        }`}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/*,.pdf"
          onChange={handleChange}
        />

        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3.5 shadow-sm">
          <i className="fas fa-cloud-arrow-up text-2xl"></i>
        </div>

        <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-1">
          Drag and drop your report here, or <span className="text-blue-600 dark:text-blue-400 underline">browse files</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-3">
          Supported file formats: PDF, JPG, PNG, WEBP (up to 25 MB). Scanned multi-page clinical lab documents welcome.
        </p>

        <div className="inline-flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
          <span className="flex items-center gap-1.5">
            <i className="fas fa-lock text-emerald-500"></i> HIPAA Guidelines Respected
          </span>
          <span className="flex items-center gap-1.5">
            <i className="fas fa-eye-slash text-slate-400"></i> Automated PII Anonymization
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 text-xs flex items-center gap-2">
          <i className="fas fa-exclamation-circle text-rose-500"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Test Exploration Chips */}
      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Explore with Standard Clinical Lab Samples:
          </span>
          <span className="text-[10px] text-slate-400">Click to run instant analysis</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleLoadSample('cbc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <i className="fas fa-vial text-rose-500"></i> Complete Blood Count (CBC)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('lipid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <i className="fas fa-heart-pulse text-amber-500"></i> Lipid & Cholesterol Panel
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('metabolic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <i className="fas fa-dna text-blue-500"></i> Metabolic Profile (CMP)
          </button>
        </div>
      </div>
    </Card>
  );
};
