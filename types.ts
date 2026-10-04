
export enum AppMode {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  EMERGENCY = 'EMERGENCY',
  ANALYSIS = 'ANALYSIS',
  VISUAL_SYMPTOM_CHECK = 'VISUAL_SYMPTOM_CHECK',
  MY_MEDS = 'MY_MEDS',
  ADD_MEDICATION = 'ADD_MEDICATION',
  VACCINE = 'VACCINE',
  HEALTH_HISTORY = 'HEALTH_HISTORY',
  BODY_SCAN = 'BODY_SCAN',
  AI_CHAT = 'AI_CHAT',
  SAVED_REPORTS = 'SAVED_REPORTS',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  SYMPTOM_JOURNAL = 'SYMPTOM_JOURNAL'
}

export enum AccessibilityMode {
  STANDARD = 'STANDARD',
  HIGH_CONTRAST = 'HIGH_CONTRAST'
}

export enum FontSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE'
}

export interface AccessibilitySettings {
  mode: AccessibilityMode;
  fontSize: FontSize;
  dyslexicFont: boolean;
}

export type UrgencyLevel = 'information' | 'routine' | 'urgent' | 'emergency';

export interface CitationSource {
  title: string;
  organization: string;
  url: string;
  accessDate: string;
  documentIdentifier?: string;
  publicationDate?: string;
  excerpt?: string;
  relevanceScore?: number;
}

export interface LabMeasurement {
  test: string;
  value: string | number;
  unit: string;
  referenceRangeMin?: number;
  referenceRangeMax?: number;
  referenceRangeText?: string;
  status: 'normal' | 'attention' | 'critical';
  notes?: string;
}

export interface AnalysisResult {
  summary: string;
  simpleExplanation: string;
  childExplanation: string; // For Teddy Bear mode
  estimatedCost: string; // Based on location
  urgency?: UrgencyLevel;
  redFlags: Array<{
    finding: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
  }>;
  labMeasurements?: LabMeasurement[];
  medicationInteractions: Array<{
    medication: string;
    interaction: string;
  }>;
  nextSteps: string[];
  questionsForDoctor?: string[];
  possibleExplanations?: string[];
  sources?: CitationSource[];
  disclaimer?: string;
  emergencyActionRequired?: boolean;
  language: string;
  date?: number; // For history
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  urgency?: UrgencyLevel;
  redFlags?: string[];
  possibleExplanations?: string[];
  recommendedNextSteps?: string[];
  questionsForDoctor?: string[];
  sources?: CitationSource[];
  disclaimer?: string;
  emergencyActionRequired?: boolean;
}

export interface DoctorLetter {
  patientName: string;
  date: string;
  summary: string;
  findings: string[];
  criticalNotes: string[];
  questionsForDoctor: string[];
  disclaimer?: string;
}

export interface VisualSymptomResult {
  urgency: 'GREEN' | 'YELLOW' | 'RED';
  urgencyLabel?: string;
  conditionName: string;
  possibleCauses: string[];
  recommendation: string;
  disclaimer: string;
  childExplanation: string; // Added for Teddy Bear mode
}

export interface PillVerificationResult {
  shape: string;
  color: string;
  imprint?: string;
  description: string;
  likelyMedication?: string;
  safetyNotes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string; // HH:MM 24h format
  instructions: string;
  lastTakenDate: string | null; // YYYY-MM-DD
  lastNotificationDate: string | null; // YYYY-MM-DD used to prevent double notifications
  pillPhoto?: string | null; // Photo data URL of physical pill for visual verification
  pillAppearance?: string | null; // e.g. "White oval scored tablet with imprint M367"
  pillColor?: string | null;
  pillShape?: string | null;
  pillImprint?: string | null;
}

export interface MedicationAnalysisResult {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

export interface Vaccine {
  id: string;
  name: string;
  dateGiven: string;
  nextDueDate: string | null;
  status: 'VALID' | 'EXPIRED' | 'UPCOMING';
  notes: string;
}

export interface StoredReport {
  id: string;
  date: number;
  fileName: string;
  result: AnalysisResult;
  quickSummary?: string;
}

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: 'great' | 'good' | 'okay' | 'sad' | 'terrible';
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string; // e.g., Doctor, Spouse, Parent, Specialist, Emergency
  notes?: string;
}

export interface HealthMetricEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  systolic?: number; // mmHg
  diastolic?: number; // mmHg
  heartRate?: number; // bpm
  bloodGlucose?: number; // mg/dL
  weight?: number; // kg or lbs
  notes?: string;
}

export interface HealthHistory {
  conditions: string[];
  surgeries: string[];
  familyHistory: string[];
  allergies: string[];
  bloodType: string;
  organDonor: boolean;
  emergencyContacts?: EmergencyContact[];
  metrics?: HealthMetricEntry[];
}

export interface BodyScanResult {
  summary: string;
  findings: Array<{
    area: string;
    observation: string;
    severity: 'NORMAL' | 'MONITOR' | 'ACTION_REQUIRED';
  }>;
  recommendations: string[];
  nextSteps: string[];
}

export const SUPPORTED_LANGUAGES = [
  "English", "Spanish", "French", "German", "Chinese (Simplified)", "Hindi", 
  "Arabic", "Portuguese", "Russian", "Japanese", "Korean", "Italian", 
  "Turkish", "Vietnamese", "Polish", "Ukrainian", "Dutch", "Thai", 
  "Greek", "Hebrew", "Indonesian", "Malay", "Bengali", "Filipino"
];

export interface SymptomEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  symptom: string; // e.g., "Migraine / Severe Headache"
  severity: number; // 1-10 numerical scale
  duration: string; // e.g., "< 1 hour", "2-4 hours", "All day", "Persistent"
  bodyPart?: string; // e.g., "Head / Neurological", "Chest / Cardiac", "Abdomen", etc.
  triggers?: string; // e.g., "Stress, lack of sleep"
  notes?: string; // e.g., "Relieved slightly after dark room and hydration"
  createdAt?: number;
}

