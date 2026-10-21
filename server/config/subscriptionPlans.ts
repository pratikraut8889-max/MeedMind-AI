/**
 * Centralized SaaS Subscription Plans Configuration for MediMind AI.
 * 
 * Complies with Phase 3 specifications:
 * - Integer minor currency units (paise for INR, cents for USD) to eliminate floating-point calculation errors.
 * - Centrally configurable tiers (Free, Premium, Pro).
 * - Clearly defined quota limits and feature entitlements.
 */

export interface PlanLimits {
  dailyAiChats: number;
  monthlyReportAnalyses: number;
  maxUploadSizeBytes: number; // in bytes
  audioSpeechEnabled: boolean;
  doctorLetterEnabled: boolean;
  multimodalOCR: boolean;
  priorityRAG: boolean;
  medicationReminders: boolean;
  unlimitedMedications: boolean;
  caregiverProfiles: number; // 0 for self only, 1 for single friend, 5 for multiple
}

export interface PlanPricing {
  monthly: {
    amountMinor: number; // in smallest unit (e.g., 49900 = ₹499.00 or $9.99 = 999)
    currency: string;
    displayPrice: string;
  };
  annual: {
    amountMinor: number;
    currency: string;
    displayPrice: string;
    monthlyEquivalentDisplay: string;
    savingsPercent: number; // dynamically computed
  };
}

export interface SubscriptionPlanDefinition {
  id: 'free' | 'premium' | 'pro';
  name: string;
  tagline: string;
  popular?: boolean;
  pricing: {
    INR: PlanPricing;
    USD: PlanPricing;
  };
  limits: PlanLimits;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<'free' | 'premium' | 'pro', SubscriptionPlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free Patient Tier',
    tagline: 'Essential health intelligence & report translation for individuals.',
    pricing: {
      INR: {
        monthly: { amountMinor: 0, currency: 'INR', displayPrice: '₹0' },
        annual: { amountMinor: 0, currency: 'INR', displayPrice: '₹0', monthlyEquivalentDisplay: '₹0', savingsPercent: 0 }
      },
      USD: {
        monthly: { amountMinor: 0, currency: 'USD', displayPrice: '$0' },
        annual: { amountMinor: 0, currency: 'USD', displayPrice: '$0', monthlyEquivalentDisplay: '$0', savingsPercent: 0 }
      }
    },
    limits: {
      dailyAiChats: 15,
      monthlyReportAnalyses: 3,
      maxUploadSizeBytes: 5 * 1024 * 1024, // 5MB
      audioSpeechEnabled: false,
      doctorLetterEnabled: false,
      multimodalOCR: true,
      priorityRAG: false,
      medicationReminders: true,
      unlimitedMedications: false, // up to 5 medications
      caregiverProfiles: 0
    },
    features: [
      '15 AI Health Assistant queries / day',
      '3 Complete lab report analyses / month',
      'Basic MedlinePlus & CDC citation grounding',
      'Medication schedule & daily reminder alarms',
      'Interactive Medication Calendar grid',
      'Emergency 911 Triage access (Never paywalled)'
    ]
  },
  premium: {
    id: 'premium',
    name: 'MediMind Premium',
    tagline: 'Comprehensive continuous clinical tracking & caregiver companion.',
    popular: true,
    pricing: {
      INR: {
        monthly: { amountMinor: 49900, currency: 'INR', displayPrice: '₹499' },
        annual: { amountMinor: 479000, currency: 'INR', displayPrice: '₹4,790', monthlyEquivalentDisplay: '₹399', savingsPercent: 20 }
      },
      USD: {
        monthly: { amountMinor: 999, currency: 'USD', displayPrice: '$9.99' },
        annual: { amountMinor: 9599, currency: 'USD', displayPrice: '$95.99', monthlyEquivalentDisplay: '$7.99', savingsPercent: 20 }
      }
    },
    limits: {
      dailyAiChats: 100,
      monthlyReportAnalyses: 30,
      maxUploadSizeBytes: 15 * 1024 * 1024, // 15MB
      audioSpeechEnabled: true,
      doctorLetterEnabled: true,
      multimodalOCR: true,
      priorityRAG: true,
      medicationReminders: true,
      unlimitedMedications: true,
      caregiverProfiles: 1 // Eleanor Vance / Loved one personalization
    },
    features: [
      '100 AI Health Assistant queries / day',
      '30 Clinical report analyses / month (PDF & Images)',
      'Clinical Doctor Visit preparation letter generation',
      'Audio read-aloud voice playback for accessibility',
      'Visual Pill photo verification & drug-drug interaction warnings',
      'Doctor-grade Adherence Summary PDF export',
      '"Build for a Friend" Care Profile (1 Loved one)'
    ]
  },
  pro: {
    id: 'pro',
    name: 'MediMind Pro / Family',
    tagline: 'High-volume clinical intelligence for families and chronic care.',
    pricing: {
      INR: {
        monthly: { amountMinor: 129900, currency: 'INR', displayPrice: '₹1,299' },
        annual: { amountMinor: 1247000, currency: 'INR', displayPrice: '₹12,470', monthlyEquivalentDisplay: '₹1,039', savingsPercent: 20 }
      },
      USD: {
        monthly: { amountMinor: 2499, currency: 'USD', displayPrice: '$24.99' },
        annual: { amountMinor: 23999, currency: 'USD', displayPrice: '$239.99', monthlyEquivalentDisplay: '$19.99', savingsPercent: 20 }
      }
    },
    limits: {
      dailyAiChats: 300,
      monthlyReportAnalyses: 100,
      maxUploadSizeBytes: 20 * 1024 * 1024, // 20MB
      audioSpeechEnabled: true,
      doctorLetterEnabled: true,
      multimodalOCR: true,
      priorityRAG: true,
      medicationReminders: true,
      unlimitedMedications: true,
      caregiverProfiles: 5
    },
    features: [
      '300 AI queries / day (Fair use clinical bandwidth)',
      '100 Medical report analyses / month',
      'Multi-document biomarker trend comparison',
      'Optical dermatology & visual symptom cam analysis',
      'Up to 5 Caregiver / Family health profiles',
      'Custom Medical Knowledge Guideline uploads in RAG',
      'Priority server-side processing & SLA response guarantee'
    ]
  }
};

/**
 * Calculates discount percent dynamically from monthly vs annual minor amounts
 */
export function calculateSavingsPercent(monthlyMinor: number, annualMinor: number): number {
  if (monthlyMinor <= 0) return 0;
  const annualMonthlyEquivalent = annualMinor / 12;
  const savings = ((monthlyMinor - annualMonthlyEquivalent) / monthlyMinor) * 100;
  return Math.max(0, Math.round(savings));
}
