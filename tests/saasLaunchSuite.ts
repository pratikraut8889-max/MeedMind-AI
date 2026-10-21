import crypto from 'crypto';
import { SUBSCRIPTION_PLANS, calculateSavingsPercent } from '../server/config/subscriptionPlans';
import { PaymentService } from '../server/services/paymentService';
import {
  getOrCreateUserUsage,
  recordAiUsage,
  requireAiQuota,
  getSystemAiUsageStats
} from '../server/middleware/usageAccounting';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🩺 MediMind AI SaaS Production Launch Verification Suite');
  console.log('======================================================\n');

  // TEST SUITE 1: Subscription Plans Configuration & Currencies
  console.log('--- Suite 1: SaaS Plans & Minor Unit Currency Pricing ---');
  {
    assert(!!SUBSCRIPTION_PLANS.free, 'Free tier definition exists');
    assert(!!SUBSCRIPTION_PLANS.premium, 'Premium tier definition exists');
    assert(!!SUBSCRIPTION_PLANS.pro, 'Pro tier definition exists');

    // Minor currency units test: Ensure integers to eliminate floating point issues
    assert(Number.isInteger(SUBSCRIPTION_PLANS.premium.pricing.INR.monthly.amountMinor), 'Premium INR price in integer minor units (paise)');
    assert(SUBSCRIPTION_PLANS.premium.pricing.INR.monthly.amountMinor === 49900, 'Premium INR monthly amount is 49900 paise (₹499.00)');
    assert(SUBSCRIPTION_PLANS.premium.pricing.USD.monthly.amountMinor === 999, 'Premium USD monthly amount is 999 cents ($9.99)');

    // Dynamic savings calculation
    const savings = calculateSavingsPercent(49900, 479000);
    assert(savings >= 19 && savings <= 21, `Dynamic annual discount calculation computes correctly (${savings}%)`);
  }

  // TEST SUITE 2: Cryptographic Signature Verification & Constant-Time Security
  console.log('\n--- Suite 2: Cryptographic Payment Verification (HMAC-SHA256) ---');
  {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_medimind_demo';
    const orderId = 'order_test_998877';
    const paymentId = 'pay_test_112233';
    const validSignature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    const validResult = PaymentService.verifyPaymentSignature({
      userId: 'test_user_1',
      provider: 'razorpay',
      orderId,
      paymentId,
      signature: validSignature,
      planId: 'premium',
      billingInterval: 'monthly'
    });
    assert(validResult.verified === true, 'Valid Razorpay HMAC signature verifies successfully');

    // Tampered signature rejection
    const invalidSignature = validSignature.slice(0, -2) + 'aa';
    const invalidResult = PaymentService.verifyPaymentSignature({
      userId: 'test_user_1',
      provider: 'razorpay',
      orderId,
      paymentId,
      signature: invalidSignature,
      planId: 'premium',
      billingInterval: 'monthly'
    });
    assert(invalidResult.verified === false, 'Tampered payment signature rejected by timing-safe comparison');
  }

  // TEST SUITE 3: Idempotent Webhook Processing
  console.log('\n--- Suite 3: Webhook Verification & Idempotency Protection ---');
  {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_whsec_medimind_demo';
    const payload = JSON.stringify({ event: 'payment.captured', id: 'evt_test_unique_456' });
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const whResult = PaymentService.verifyWebhookEvent('razorpay', payload, signature);
    assert(whResult.valid === true, 'Webhook HMAC signature validated successfully');

    const eventId = 'evt_test_unique_456';
    assert(!PaymentService.isEventProcessed(eventId), 'Event is initially unprocessed');
    PaymentService.markEventProcessed(eventId);
    assert(PaymentService.isEventProcessed(eventId), 'Event is marked processed');
    assert(PaymentService.isEventProcessed(eventId), 'Duplicate replayed event recognized as already processed (Idempotency)');
  }

  // TEST SUITE 4: Subscription Lifecycle (Activation & Cancellation)
  console.log('\n--- Suite 4: Subscription State & Cancellation Flow ---');
  {
    const userId = 'patient_charlie_test';
    const sub = await PaymentService.activateSubscription(userId, 'premium', 'monthly', 'razorpay', {
      orderId: 'order_test_1',
      paymentId: 'pay_test_1'
    });

    assert(sub.status === 'active', 'Subscription activated with status active');
    assert(sub.planId === 'premium', 'Subscription plan is premium');
    assert(sub.currentPeriodEnd > Date.now(), 'Subscription period extends into future');

    // Cancellation at period end
    const cancelRes = PaymentService.cancelSubscription(userId);
    assert(cancelRes.success === true, 'Cancellation request succeeds');
    assert(cancelRes.subscription?.cancelAtPeriodEnd === true, 'Subscription flagged cancelAtPeriodEnd without immediate access revocation');
  }

  // TEST SUITE 5: Server-side AI Quota Enforcement & Emergency Bypass
  console.log('\n--- Suite 5: AI Quota Enforcement & Life-Critical Emergency Bypass ---');
  {
    const testUserId = 'test_quota_user';
    const userState = getOrCreateUserUsage(testUserId);
    assert(userState.dailyChatCount === 0, 'New user initializes with 0 chats used');

    // Record usage
    recordAiUsage(testUserId, 'chat', 300, 400);
    assert(userState.dailyChatCount === 1, 'Chat usage increments to 1');
    assert(userState.totalTokensProcessed === 700, 'Token accounting correctly sums 700 tokens');
    assert(userState.estimatedCostUsd > 0, 'Estimated compute cost calculated ($ > 0)');

    // Simulate quota check middleware for emergency
    let nextCalled: any = false;
    const mockEmergencyReq: any = {
      path: '/api/ai/emergency-triage',
      headers: { 'x-user-id': testUserId },
      body: {}
    };
    const mockEmergencyRes: any = {
      status: () => mockEmergencyRes,
      json: () => {}
    };

    const emergencyMiddleware = requireAiQuota('emergency');
    emergencyMiddleware(mockEmergencyReq, mockEmergencyRes, () => {
      nextCalled = true;
    });

    assert(nextCalled === true, 'Emergency mode triage unconditionally bypasses quota checks (Clinical Safety)');
  }

  // TEST SUITE 6: Zero PII Business Analytics & Margins
  console.log('\n--- Suite 6: Aggregated Business Metrics & Zero PII Protection ---');
  {
    const stats = getSystemAiUsageStats();
    assert(typeof stats.totalTrackedUsers === 'number', 'Tracked users count is numeric');
    assert(typeof stats.totalTokensEstimated === 'number', 'Tokens count is numeric');
    assert(typeof stats.totalEstimatedAiCostUsd === 'number', 'Estimated AI cost is numeric');

    // Verify zero PII: none of the returned keys or object properties contain patient text
    const jsonStr = JSON.stringify(stats);
    assert(!jsonStr.includes('patient'), 'Zero PII: no patient names in telemetry output');
    assert(!jsonStr.includes('diagnosis'), 'Zero PII: no medical diagnosis fields in telemetry output');
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} SAAS PRODUCTION LAUNCH TESTS PASSED!`);
  console.log('======================================================\n');
}

runAllTests().catch((err) => {
  console.error('[Test Execution Aborted]', err);
  process.exit(1);
});
