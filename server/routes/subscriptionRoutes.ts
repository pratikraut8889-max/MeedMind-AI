import { Router, Request, Response } from 'express';
import { SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';
import { PaymentService, PaymentVerificationRequest } from '../services/paymentService';
import { getOrCreateUserUsage } from '../middleware/usageAccounting';
import crypto from 'crypto';

export const subscriptionRouter = Router();

/**
 * 1. GET /api/subscription/plans
 * Returns public plans catalog, features, and dynamic pricing
 */
subscriptionRouter.get('/plans', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    plans: Object.values(SUBSCRIPTION_PLANS),
    sandboxMode: PaymentService.isSandboxMode(),
    supportedCurrencies: ['INR', 'USD'],
    supportedProviders: ['razorpay', 'stripe']
  });
});

/**
 * 2. GET /api/subscription/status
 * Returns caller's active subscription tier, period dates, and current consumption
 */
subscriptionRouter.get('/status', (req: Request, res: Response): void => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'anonymous_user';
  const subscription = PaymentService.getUserSubscription(userId);
  const plan = SUBSCRIPTION_PLANS[subscription.planId] || SUBSCRIPTION_PLANS.free;
  const usage = getOrCreateUserUsage(userId);

  res.status(200).json({
    success: true,
    subscription,
    plan: {
      id: plan.id,
      name: plan.name,
      tagline: plan.tagline,
      limits: plan.limits,
      features: plan.features
    },
    usage: {
      dailyChatCount: usage.dailyChatCount,
      dailyChatLimit: plan.limits.dailyAiChats,
      monthlyReportCount: usage.monthlyReportCount,
      monthlyReportLimit: plan.limits.monthlyReportAnalyses,
      totalTokensProcessed: usage.totalTokensProcessed,
      estimatedCostUsd: Number(usage.estimatedCostUsd.toFixed(4)),
      resetsAt: 'Midnight UTC'
    }
  });
});

/**
 * 3. POST /api/subscription/checkout
 * Creates a server-trusted checkout session with provider key
 */
subscriptionRouter.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userEmail, userName, planId, billingInterval = 'monthly', currency = 'INR', provider = 'razorpay' } = req.body;

    if (!userId || !userEmail) {
      res.status(400).json({ error: 'MISSING_USER_INFO', message: 'userId and userEmail are required for checkout.' });
      return;
    }

    if (!planId || !SUBSCRIPTION_PLANS[planId as 'free' | 'premium' | 'pro']) {
      res.status(400).json({ error: 'INVALID_PLAN', message: 'Valid planId (premium | pro) is required.' });
      return;
    }

    if (planId === 'free') {
      res.status(400).json({ error: 'FREE_PLAN_CHECKOUT', message: 'Free tier does not require checkout.' });
      return;
    }

    const session = await PaymentService.createCheckoutSession({
      userId,
      userEmail,
      userName,
      planId: planId as 'premium' | 'pro',
      billingInterval: billingInterval === 'annual' ? 'annual' : 'monthly',
      currency: currency === 'USD' ? 'USD' : 'INR',
      provider: provider === 'stripe' ? 'stripe' : 'razorpay'
    });

    res.status(200).json({
      success: true,
      session
    });
  } catch (error: any) {
    console.error('[Checkout Creation Error]', error?.message || error);
    res.status(500).json({
      error: 'CHECKOUT_CREATION_FAILED',
      message: error?.message || 'Could not initiate secure checkout.'
    });
  }
});

/**
 * 4. POST /api/subscription/verify
 * Cryptographically verifies payment signature and activates subscription
 */
subscriptionRouter.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, provider = 'razorpay', orderId, paymentId, signature, planId, billingInterval = 'monthly' } = req.body;

    if (!userId || !orderId || !paymentId || !signature || !planId) {
      res.status(400).json({
        error: 'MISSING_PAYMENT_PROOF',
        message: 'userId, orderId, paymentId, signature, and planId are required for activation.'
      });
      return;
    }

    // Cryptographic signature check
    const verification = PaymentService.verifyPaymentSignature({
      userId,
      provider,
      orderId,
      paymentId,
      signature,
      planId,
      billingInterval
    });

    if (!verification.verified) {
      console.warn('[Payment Signature Verification Rejected]', { userId, orderId, paymentId, error: verification.error });
      res.status(400).json({
        error: 'INVALID_PAYMENT_SIGNATURE',
        message: verification.error || 'Payment verification failed. Access cannot be granted.'
      });
      return;
    }

    // Activate subscription in server ledger
    const subscription = await PaymentService.activateSubscription(
      userId,
      planId,
      billingInterval,
      provider,
      { orderId, paymentId }
    );

    res.status(200).json({
      success: true,
      message: `Successfully upgraded to MediMind ${planId.toUpperCase()}!`,
      subscription
    });
  } catch (error: any) {
    console.error('[Payment Verification Route Error]', error?.message || error);
    res.status(500).json({
      error: 'VERIFICATION_PROCESS_ERROR',
      message: error?.message || 'Failed to complete payment verification.'
    });
  }
});

/**
 * 5. POST /api/subscription/cancel
 * Cancels recurring subscription at period end
 */
subscriptionRouter.post('/cancel', (req: Request, res: Response): void => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'MISSING_USER_ID', message: 'userId is required.' });
    return;
  }

  const result = PaymentService.cancelSubscription(userId);
  if (!result.success) {
    res.status(400).json({ error: 'CANCELLATION_FAILED', message: result.message });
    return;
  }

  res.status(200).json(result);
});

/**
 * 6. POST /api/subscription/simulate-sandbox-checkout
 * Developer / Test Sandbox helper: Generates valid test payment tokens for automated testing
 * or sandbox demonstration without entering real card credentials.
 */
subscriptionRouter.post('/simulate-sandbox-checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, planId, billingInterval = 'monthly', provider = 'razorpay' } = req.body;

    if (!userId || !planId) {
      res.status(400).json({ error: 'INVALID_PARAMETERS', message: 'userId and planId required.' });
      return;
    }

    // Generate valid sandbox order & signature
    const orderId = `order_sandbox_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const paymentId = `pay_sandbox_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    let signature = '';
    if (provider === 'razorpay') {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_medimind_demo';
      signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    } else {
      const secret = process.env.STRIPE_SECRET_KEY || 'sk_test_medimind_demo';
      signature = crypto.createHmac('sha256', secret).update(`${orderId}:${paymentId}`).digest('hex');
    }

    // Direct verified activation
    const subscription = await PaymentService.activateSubscription(
      userId,
      planId,
      billingInterval,
      provider,
      { orderId, paymentId }
    );

    res.status(200).json({
      success: true,
      simulated: true,
      orderId,
      paymentId,
      signature,
      subscription
    });
  } catch (error: any) {
    res.status(500).json({ error: 'SIMULATION_ERROR', message: error.message });
  }
});

/**
 * 7. POST /api/subscription/webhook/razorpay
 * Signed Razorpay Webhook with Idempotency Protection
 */
subscriptionRouter.post('/webhook/razorpay', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  const verification = PaymentService.verifyWebhookEvent('razorpay', rawBody, signature);
  if (!verification.valid) {
    res.status(400).json({ error: 'INVALID_WEBHOOK_SIGNATURE', message: verification.error });
    return;
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const eventId = payload.event_id || payload.id || `rzp_evt_${Date.now()}`;

  // Idempotency check
  if (PaymentService.isEventProcessed(eventId)) {
    res.status(200).json({ status: 'ignored_duplicate', eventId });
    return;
  }
  PaymentService.markEventProcessed(eventId);

  const eventType = payload.event;
  console.log(`[Razorpay Webhook Verified] Event: ${eventType}, ID: ${eventId}`);

  // Handle subscription payment events
  if (eventType === 'payment.captured' || eventType === 'order.paid' || eventType === 'subscription.charged') {
    const paymentEntity = payload.payload?.payment?.entity || payload.payload?.order?.entity;
    const notes = paymentEntity?.notes || {};
    const userId = notes.userId || notes.user_id;
    const planId = notes.planId || notes.plan_id || 'premium';
    const billingInterval = notes.billingInterval || 'monthly';

    if (userId) {
      await PaymentService.activateSubscription(
        userId,
        planId,
        billingInterval,
        'razorpay',
        {
          orderId: paymentEntity?.order_id,
          paymentId: paymentEntity?.id,
          amountMinor: paymentEntity?.amount,
          currency: paymentEntity?.currency
        }
      );
    }
  }

  res.status(200).json({ status: 'processed', eventId });
});
