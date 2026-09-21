import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { Button, Card, Badge, PageHeader, ClinicalLoadingState } from './SharedComponents';

interface SymptomCheckViewProps {
  language: string;
  highContrast: boolean;
  darkMode: boolean;
  onBack: () => void;
}

export const SymptomCheckView: React.FC<SymptomCheckViewProps> = ({
  language,
  highContrast,
  darkMode,
  onBack
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setCameraError(null);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setCameraError('Camera access unavailable. Please enable permissions or upload a photo directly.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    // Stop camera stream to conserve power
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    analyzeImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        analyzeImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const base64Data = dataUrl.split(',')[1];
      const res = await GeminiService.analyzeVisualSymptom(base64Data, language);
      setResult({
        summary: res.conditionName ? `${res.conditionName}: ${res.recommendation}` : (res as any).summary || res.recommendation,
        urgency: res.urgency === 'RED' ? 'emergency' : res.urgency === 'YELLOW' ? 'urgent' : 'routine',
        urgencyLabel: res.urgencyLabel || (res.urgency === 'RED' ? 'Immediate Medical Attention' : res.urgency === 'YELLOW' ? 'Consultation Recommended' : 'Routine Monitoring'),
        conditionName: res.conditionName,
        possibleCauses: res.possibleCauses || (res as any).possibleExplanations || [],
        recommendations: [res.recommendation].filter(Boolean),
        childExplanation: res.childExplanation,
        disclaimer: res.disclaimer
      });
    } catch (err) {
      console.error('Symptom analysis error:', err);
      setResult({
        summary: 'Clinical visual analysis encountered an error. Please ensure the image is sharp and well-lit.',
        urgency: 'routine',
        urgencyLabel: 'Routine Monitoring',
        conditionName: 'Image Inconclusive',
        possibleCauses: ['Poor illumination or blur in captured photo', 'Non-dermatological surface in frame'],
        recommendations: ['Consult your primary healthcare provider or dermatologist for direct examination.'],
        disclaimer: 'This automated tool cannot replace an in-person physical examination by a licensed medical practitioner.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
    startCamera();
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-900'}`}>
      <PageHeader
        title="Visual Symptom Analysis"
        description="Clinical optical triage for dermatological observations, rashes, swelling, or localized lesions"
        badge={<Badge tone="ai" icon="fas fa-eye">Optical Clinical AI</Badge>}
        onBack={onBack}
        backText="Dashboard"
        darkMode={darkMode}
        highContrast={highContrast}
      />

      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main Viewport Card */}
      {!capturedImage ? (
        <Card darkMode={darkMode} highContrast={highContrast} className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-[16/10] flex items-center justify-center border border-slate-700">
            {cameraError ? (
              <div className="p-6 text-center text-slate-300 max-w-sm">
                <i className="fas fa-camera-slash text-3xl mb-3 text-slate-500"></i>
                <p className="text-xs mb-4 leading-relaxed">{cameraError}</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<i className="fas fa-upload"></i>}
                >
                  Upload Symptom Photo
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Clinical Framing Guide Box */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="w-56 h-56 sm:w-72 sm:h-72 border-2 border-dashed border-white/70 rounded-3xl relative shadow-2xl">
                    <div className="absolute top-2 left-2 text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                      Align symptom area here
                    </div>
                  </div>
                </div>

                {/* Camera Top Controls */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={toggleCameraFacing}
                    className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                    title="Flip camera"
                  >
                    <i className="fas fa-camera-rotate text-sm"></i>
                  </button>
                </div>

                {/* Shutter Bar */}
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs backdrop-blur-sm transition"
                    title="Upload photo from library"
                  >
                    <i className="fas fa-image text-sm"></i>
                  </button>

                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full border-4 border-white bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center text-xl shadow-xl transition-all cursor-pointer"
                    aria-label="Take picture"
                  >
                    <i className="fas fa-camera"></i>
                  </button>

                  <div className="w-10"></div>
                </div>
              </>
            )}
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2.5">
            <i className="fas fa-lightbulb text-blue-600 text-sm"></i>
            <span>
              <strong>Capture Tip:</strong> Ensure bright, natural illumination without harsh glare or heavy shadows. Hold camera 6 to 12 inches away from the area.
            </span>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Photo Preview & Retake Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <img
                src={capturedImage}
                alt="Captured symptom"
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Symptom Observation Frame</p>
                <p className="text-[11px] text-slate-500">Captured for optical AI triage</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRetake}
              leftIcon={<i className="fas fa-rotate-left"></i>}
            >
              Take Another Photo
            </Button>
          </div>

          {/* Analysis State or Results */}
          {isAnalyzing ? (
            <Card darkMode={darkMode} highContrast={highContrast}>
              <ClinicalLoadingState
                stepText="Analyzing Visual Features..."
                subText="Evaluating lesion borders, pigmentation uniformity, surface texture, and clinical urgency markers."
                darkMode={darkMode}
              />
            </Card>
          ) : result ? (
            <div className="space-y-4">
              {/* Triage Urgency Header */}
              <Card
                accent={result.urgency === 'urgent' || result.urgency === 'emergency' ? 'danger' : 'info'}
                darkMode={darkMode}
                highContrast={highContrast}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <i className="fas fa-notes-medical text-blue-600"></i>
                    <span>Visual Assessment Summary</span>
                  </h2>
                  <Badge
                    tone={
                      result.urgency === 'emergency'
                        ? 'danger'
                        : result.urgency === 'urgent'
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {result.urgency ? `${result.urgency.toUpperCase()} TRIAGE` : 'ROUTINE EVALUATION'}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {result.summary}
                </p>
              </Card>

              {/* Red Flags / Warning Signs */}
              {result.redFlags && result.redFlags.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200">
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <i className="fas fa-triangle-exclamation text-rose-600"></i>
                    <span>Critical Warning Signs</span>
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                    {result.redFlags.map((rf: string, idx: number) => (
                      <li key={idx}>{rf}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Differential Possibilities */}
              {((result.possibleCauses && result.possibleCauses.length > 0) || (result.possibleExplanations && result.possibleExplanations.length > 0)) && (
                <Card darkMode={darkMode} highContrast={highContrast}>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <i className="fas fa-magnifying-glass-chart text-indigo-600"></i>
                    <span>Differential Considerations (Non-Diagnostic)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    These are general patterns commonly matching these visual traits. Only a licensed physician can provide a definitive diagnosis.
                  </p>
                  <div className="space-y-2">
                    {(result.possibleCauses || result.possibleExplanations || []).map((exp: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs sm:text-sm"
                      >
                        {exp}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recommended Next Actions */}
              {((result.recommendations && result.recommendations.length > 0) || (result.recommendedNextSteps && result.recommendedNextSteps.length > 0)) && (
                <Card accent="primary" darkMode={darkMode} highContrast={highContrast}>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <i className="fas fa-list-check text-blue-600"></i>
                    <span>Recommended Next Steps & Guidance</span>
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm">
                    {(result.recommendations || result.recommendedNextSteps || []).map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <i className="fas fa-circle-check text-blue-600 text-xs mt-1 shrink-0"></i>
                        <span className="text-slate-700 dark:text-slate-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Legal Clinical Disclaimer */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                MediMind Optical AI provides preliminary educational triage. It is not an FDA-cleared diagnostic device. If you experience rapidly spreading redness, severe pain, fever, or pus drainage, seek prompt in-person medical attention.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
