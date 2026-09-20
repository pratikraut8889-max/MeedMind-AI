
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
  BODY_SCAN = 'BODY_SCAN'
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

export interface AnalysisResult {
  summary: string;
  simpleExplanation: string;
  childExplanation: string; // For Teddy Bear mode
  estimatedCost: string; // Based on location
  redFlags: Array<{
    finding: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
  }>;
  medicationInteractions: Array<{
    medication: string;
    interaction: string;
  }>;
  nextSteps: string[];
  language: string;
  date?: number; // For history
}

export interface DoctorLetter {
  patientName: string;
  date: string;
  summary: string;
  findings: string[];
  criticalNotes: string[];
  questionsForDoctor: string[];
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

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string; // HH:MM 24h format
  instructions: string;
  lastTakenDate: string | null; // YYYY-MM-DD
  lastNotificationDate: string | null; // YYYY-MM-DD used to prevent double notifications
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
