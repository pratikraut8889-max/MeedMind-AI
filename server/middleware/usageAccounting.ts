import { Request, Response, NextFunction } from 'express';
import { SUBSCRIPTION_PLANS, SubscriptionPlanDefinition } from '../config/subscriptionPlans';
import { PaymentService } from '../services/paymentService';

export interface UserUsageState {
  userId: string;
  dailyChatCount: number;
  lastChatResetDate: string; // YYYY-MM-DD
  monthlyReportCount: number;
  lastReportResetMonth: string; // YYYY-MM
  totalTokensProcessed: number;
  estimatedCostUsd: number;
  totalRequests: number;
  lastRequestTimestamp: number;
}

// In-memory persistent usage store for active runtime
const userUsageStore = new Map<string, UserUsageState>();

// System-wide aggregated counters (strictly zero PII)
let systemTotalTokens = 0;
let systemTotalCostUsd = 0;
let systemTotalRequests = 0;
let systemTotalChats = 0;
let systemTotalReports = 0;

/**
 * Get current UTC date string YYYY-MM-DD
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current UTC month string YYYY-MM
 */
function getCurrentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get or initialize usage tracking for a given user
 */
export function getOrCreateUserUsage(userId: string): UserUsageState {
  const today = getTodayDateString();
  const currentMonth = getCurrentMonthString();

  let state = userUsageStore.get(userId);
  if (!state) {
    state = {
      userId,
      dailyChatCount: 0,
      lastChatResetDate: today,
      monthlyReportCount: 0,
      lastReportResetMonth: currentMonth,
      totalTokensProcessed: 0,
      estimatedCostUsd: 0,
      totalRequests: 0,
      lastRequestTimestamp: Date.now()
    };
    userUsageStore.set(userId, state);
    return state;
  }

  // Daily quota reset check
  if (state.lastChatResetDate !== today) {
    state.dailyChatCount = 0;
    state.lastChatResetDate = today;
  }

  // Monthly report quota reset check
  if (state.lastReportResetMonth !== currentMonth) {
    state.monthlyReportCount = 0;
    state.lastReportResetMonth = currentMonth;
  }

  return state;
}

/**
 * Record usage tokens and calculate infrastructure cost estimate
 * Rates based on Gemini 2.5 Flash:
 * Input: $0.15 per 1M tokens ($0.00000015/token)
 * Output: $0.60 per 1M tokens ($0.00000060/token)
 */
export function recordAiUsage(
  userId: string,
  feature: 'chat' | 'report_analysis' | 'tts' | 'letter' | 'image' | 'emergency',
  inputTokens: number = 250,
  outputTokens: number = 400
): void {
  const state = getOrCreateUserUsage(userId);
  const totalTokens = inputTokens + outputTokens;
  const cost = (inputTokens * 0.00000015) + (outputTokens * 0.00000060);

  state.totalTokensProcessed += totalTokens;
  state.estimatedCostUsd += cost;
  state.totalRequests += 1;
  state.lastRequestTimestamp = Date.now();

  if (feature === 'chat') {
    state.dailyChatCount += 1;
    systemTotalChats += 1;
  } else if (feature === 'report_analysis') {
    state.monthlyReportCount += 1;
    systemTotalReports += 1;
  }

  // Update system aggregates
  systemTotalTokens += totalTokens;
  systemTotalCostUsd += cost;
  systemTotalRequests += 1;
}

/**
 * Middleware factory for server-side AI quota enforcement
 * Emergency triage is explicitly exempt to uphold medical safety compliance.
 */
export function requireAiQuota(featureType: 'chat' | 'report_analysis' | 'tts' | 'letter' | 'image' | 'emergency') {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Emergency mode is NEVER blocked or paywalled
    if (featureType === 'emergency' || req.path.includes('emergency')) {
      return next();
    }

    // 2. Resolve user identity from token/header/body
    const rawUserId = (req.headers['x-user-id'] as string) || req.body?.userId || req.body?.userContext?.userId || 'anonymous_user';
    const userId = typeof rawUserId === 'string' && rawUserId.trim() ? rawUserId.trim() : 'anonymous_user';

    // 3. Resolve active plan & limits
    const subscription = PaymentService.getUserSubscription(userId);
    const plan = SUBSCRIPTION_PLANS[subscription.planId] || SUBSCRIPTION_PLANS.free;
    const usage = getOrCreateUserUsage(userId);

    // 4. Feature entitlement & quota checks
    if (featureType === 'chat') {
      if (usage.dailyChatCount >= plan.limits.dailyAiChats) {
        res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          code: 'DAILY_CHAT_LIMIT_REACHED',
          message: `You have reached your daily limit of ${plan.limits.dailyAiChats} AI consultations for the ${plan.name}.`,
          currentUsage: usage.dailyChatCount,
          limit: plan.limits.dailyAiChats,
          planId: plan.id,
          resetsAt: 'Midnight UTC',
          upgradeAvailable: plan.id !== 'pro',
          upgradeUrl: '/pricing'
        });
        return;
      }
    }

    if (featureType === 'report_analysis') {
      if (usage.monthlyReportCount >= plan.limits.monthlyReportAnalyses) {
        res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          code: 'MONTHLY_REPORT_LIMIT_REACHED',
          message: `You have reached your monthly limit of ${plan.limits.monthlyReportAnalyses} clinical report analyses for the ${plan.name}.`,
          currentUsage: usage.monthlyReportCount,
          limit: plan.limits.monthlyReportAnalyses,
          planId: plan.id,
          resetsAt: 'First day of next calendar month',
          upgradeAvailable: plan.id !== 'pro',
          upgradeUrl: '/pricing'
        });
        return;
      }
    }

    if (featureType === 'tts' && !plan.limits.audioSpeechEnabled) {
      res.status(403).json({
        error: 'FEATURE_NOT_IN_PLAN',
        code: 'AUDIO_SPEECH_PREMIUM_ONLY',
        message: 'Audio read-aloud voice playback is available exclusively on MediMind Premium and Pro plans.',
        planId: plan.id,
        upgradeUrl: '/pricing'
      });
      return;
    }

    if (featureType === 'letter' && !plan.limits.doctorLetterEnabled) {
      res.status(403).json({
        error: 'FEATURE_NOT_IN_PLAN',
        code: 'DOCTOR_LETTER_PREMIUM_ONLY',
        message: 'Clinical Physician Summary Letter generation is a feature of MediMind Premium and Pro.',
        planId: plan.id,
        upgradeUrl: '/pricing'
      });
      return;
    }

    // Attach verified user and plan context for route usage recording
    (req as any).userSubscription = subscription;
    (req as any).userPlan = plan;
    (req as any).resolvedUserId = userId;

    next();
  };
}

/**
 * Returns privacy-preserving system-wide AI infrastructure usage metrics
 */
export function getSystemAiUsageStats() {
  const activeUserCount = userUsageStore.size;

  return {
    totalTrackedUsers: activeUserCount,
    totalRequestsProcessed: systemTotalRequests,
    totalChats: systemTotalChats,
    totalReportAnalyses: systemTotalReports,
    totalTokensEstimated: systemTotalTokens,
    totalEstimatedAiCostUsd: Number(systemTotalCostUsd.toFixed(4)),
    averageCostPerUserUsd: activeUserCount > 0 ? Number((systemTotalCostUsd / activeUserCount).toFixed(4)) : 0
  };
}
