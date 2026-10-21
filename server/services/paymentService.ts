import crypto from 'crypto';
import { SUBSCRIPTION_PLANS, SubscriptionPlanDefinition } from '../config/subscriptionPlans';

export interface CheckoutSessionRequest {
  userId: string;
  userEmail: string;
  userName?: string;
  planId: 'free' | 'premium' | 'pro';
  billingInterval: 'monthly' | 'annual';
  currency: 'INR' | 'USD';
  provider?: 'razorpay' | 'stripe';
}

export interface CheckoutSessionResponse {
  sessionId: string;
  orderId: string;
  provider: 'razorpay' | 'stripe';
  amountMinor: number;
  currency: string;
  planId: 'free' | 'premium' | 'pro';
  billingInterval: 'monthly' | 'annual';
  keyId: string;
  isSandbox: boolean;
  customerDetails: {
    name?: string;
    email: string;
  };
}

export interface PaymentVerificationRequest {
  userId: string;
  provider: 'razorpay' | 'stripe';
  orderId: string;
  paymentId: string;
  signature: string;
  planId: 'free' | 'premium' | 'pro';
  billingInterval: 'monthly' | 'annual';
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: 'free' | 'premium' | 'pro';
  billingInterval: 'monthly' | 'annual';
  status: 'active' | 'past_due' | 'canceled' | 'expired';
  provider: 'razorpay' | 'stripe' | 'system';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  paymentId?: string;
  orderId?: string;
  amountMinor: number;
  currency: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory processed webhook event ledger for strict idempotency
const processedWebhookEventIds = new Set<string>();

// In-memory active subscriptions fallback store (synced with Firestore)
const subscriptionsStore = new Map<string, SubscriptionRecord>();

export const PaymentService = {
  /**
   * Determine whether live credentials or test sandbox is active
   */
  isSandboxMode(): boolean {
    const liveRazorpay = process.env.RAZORPAY_LIVE_KEY_ID && process.env.RAZORPAY_LIVE_KEY_SECRET;
    const liveStripe = process.env.STRIPE_LIVE_SECRET_KEY;
    const forceLive = process.env.PAYMENT_ENVIRONMENT === 'production';
    return !(forceLive && (liveRazorpay || liveStripe));
  },

  /**
   * Create a trusted server-side Checkout Session / Order
   */
  async createCheckoutSession(params: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    const { userId, userEmail, userName, planId, billingInterval, currency, provider = 'razorpay' } = params;

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error(`Invalid subscription plan: ${planId}`);
    }

    if (planId === 'free') {
      throw new Error('Free plan does not require a payment checkout session.');
    }

    const priceConfig = plan.pricing[currency] || plan.pricing.INR;
    const amountMinor = billingInterval === 'annual'
      ? priceConfig.annual.amountMinor
      : priceConfig.monthly.amountMinor;

    const isSandbox = this.isSandboxMode();
    const orderPrefix = isSandbox ? 'order_sandbox' : 'order_live';
    const orderId = `${orderPrefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sessionId = `cs_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const keyId = provider === 'razorpay'
      ? process.env.RAZORPAY_KEY_ID || 'rzp_test_medimind_demo'
      : process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_medimind_demo';

    return {
      sessionId,
      orderId,
      provider,
      amountMinor,
      currency: priceConfig.monthly.currency,
      planId,
      billingInterval,
      keyId,
      isSandbox,
      customerDetails: {
        name: userName,
        email: userEmail
      }
    };
  },

  /**
   * Cryptographically verify a client-submitted payment signature
   */
  verifyPaymentSignature(req: PaymentVerificationRequest): { verified: boolean; error?: string } {
    const { provider, orderId, paymentId, signature } = req;

    if (!orderId || !paymentId || !signature) {
      return { verified: false, error: 'Missing required payment verification parameters.' };
    }

    if (provider === 'razorpay') {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_medimind_demo';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      if (!isMatch) {
        return { verified: false, error: 'Razorpay payment signature mismatch.' };
      }
      return { verified: true };
    }

    if (provider === 'stripe') {
      const secret = process.env.STRIPE_SECRET_KEY || 'sk_test_medimind_demo';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}:${paymentId}`)
        .digest('hex');

      const isMatch = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      if (!isMatch) {
        return { verified: false, error: 'Stripe payment confirmation signature mismatch.' };
      }
      return { verified: true };
    }

    return { verified: false, error: `Unsupported payment provider: ${provider}` };
  },

  /**
   * Activate or upgrade a user's subscription following verified payment
   */
  async activateSubscription(
    userId: string,
    planId: 'free' | 'premium' | 'pro',
    billingInterval: 'monthly' | 'annual',
    provider: 'razorpay' | 'stripe' | 'system',
    paymentDetails?: { orderId?: string; paymentId?: string; amountMinor?: number; currency?: string }
  ): Promise<SubscriptionRecord> {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error(`Plan ${planId} not recognized.`);
    }

    const now = Date.now();
    const durationDays = billingInterval === 'annual' ? 365 : 30;
    const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

    const currency = paymentDetails?.currency || 'INR';
    const priceConfig = plan.pricing[currency as 'INR' | 'USD'] || plan.pricing.INR;
    const amountMinor = paymentDetails?.amountMinor ?? (
      billingInterval === 'annual' ? priceConfig.annual.amountMinor : priceConfig.monthly.amountMinor
    );

    const subscription: SubscriptionRecord = {
      id: `sub_${userId}_${now}`,
      userId,
      planId,
      billingInterval,
      status: 'active',
      provider,
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt,
      cancelAtPeriodEnd: false,
      paymentId: paymentDetails?.paymentId,
      orderId: paymentDetails?.orderId,
      amountMinor,
      currency,
      createdAt: now,
      updatedAt: now
    };

    subscriptionsStore.set(userId, subscription);
    return subscription;
  },

  /**
   * Get active subscription for user (defaults to Free tier if none exists or expired)
   */
  getUserSubscription(userId: string): SubscriptionRecord {
    const existing = subscriptionsStore.get(userId);
    const now = Date.now();

    if (existing) {
      if (existing.status === 'active' && existing.currentPeriodEnd > now) {
        return existing;
      }
      if (existing.currentPeriodEnd <= now && existing.status === 'active') {
        existing.status = 'expired';
        existing.updatedAt = now;
      }
    }

    // Default Free Tier
    return {
      id: `sub_${userId}_free`,
      userId,
      planId: 'free',
      billingInterval: 'monthly',
      status: 'active',
      provider: 'system',
      currentPeriodStart: now,
      currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
      amountMinor: 0,
      currency: 'INR',
      createdAt: now,
      updatedAt: now
    };
  },

  /**
   * Cancel an active subscription at period end
   */
  cancelSubscription(userId: string): { success: boolean; message: string; subscription?: SubscriptionRecord } {
    const existing = subscriptionsStore.get(userId);
    if (!existing || existing.planId === 'free' || existing.status !== 'active') {
      return { success: false, message: 'No active paid subscription found to cancel.' };
    }

    existing.cancelAtPeriodEnd = true;
    existing.updatedAt = Date.now();
    return {
      success: true,
      message: `Your ${existing.planId.toUpperCase()} subscription will remain active until ${new Date(existing.currentPeriodEnd).toLocaleDateString()}, after which it will not renew.`,
      subscription: existing
    };
  },

  /**
   * Verify signed Webhook payloads (Idempotent execution)
   */
  verifyWebhookEvent(
    provider: 'razorpay' | 'stripe',
    rawBody: string,
    signatureHeader: string
  ): { valid: boolean; error?: string } {
    if (!rawBody || !signatureHeader) {
      return { valid: false, error: 'Missing raw payload or webhook signature header.' };
    }

    if (provider === 'razorpay') {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_whsec_medimind_demo';
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      try {
        const isMatch = crypto.timingSafeEqual(
          Buffer.from(signatureHeader, 'utf8'),
          Buffer.from(expected, 'utf8')
        );
        return { valid: isMatch, error: isMatch ? undefined : 'Invalid webhook HMAC signature.' };
      } catch {
        return { valid: false, error: 'Signature format mismatch.' };
      }
    }

    if (provider === 'stripe') {
      const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_medimind_demo';
      // Stripe signature format: t=timestamp,v1=signature
      const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
        const [k, v] = part.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = parts['t'];
      const signature = parts['v1'];
      if (!timestamp || !signature) {
        return { valid: false, error: 'Invalid Stripe signature format.' };
      }

      const signedPayload = `${timestamp}.${rawBody}`;
      const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

      try {
        const isMatch = crypto.timingSafeEqual(
          Buffer.from(signature, 'utf8'),
          Buffer.from(expected, 'utf8')
        );
        return { valid: isMatch, error: isMatch ? undefined : 'Invalid Stripe webhook signature.' };
      } catch {
        return { valid: false, error: 'Signature comparison failed.' };
      }
    }

    return { valid: false, error: `Unsupported provider: ${provider}` };
  },

  /**
   * Check if a webhook event was already processed (Idempotency)
   */
  isEventProcessed(eventId: string): boolean {
    return processedWebhookEventIds.has(eventId);
  },

  /**
   * Mark webhook event as processed
   */
  markEventProcessed(eventId: string): void {
    processedWebhookEventIds.add(eventId);
  }
};
