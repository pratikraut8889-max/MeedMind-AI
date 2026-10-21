import React, { useState, useEffect } from 'react';
import { UserSubscriptionInfo, UserUsageInfo } from '../types';
import { SUBSCRIPTION_PLANS } from '../server/config/subscriptionPlans';

interface BillingPortalModalProps {
  userId: string;
  userEmail: string;
  subscription: UserSubscriptionInfo;
  onClose: () => void;
  onNavigateToPricing: () => void;
  onSubscriptionUpdated: (updated: UserSubscriptionInfo) => void;
}

export const BillingPortalModal: React.FC<BillingPortalModalProps> = ({
  userId,
  userEmail,
  subscription,
  onClose,
  onNavigateToPricing,
  onSubscriptionUpdated
}) => {
  const [usage, setUsage] = useState<UserUsageInfo | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/subscription/status?userId=${encodeURIComponent(userId)}`, {
          headers: { 'x-user-id': userId }
        });
        const data = await res.json();
        if (data.success && data.usage) {
          setUsage(data.usage);
        }
      } catch (err) {
        console.error('[Billing Portal Status Error]', err);
      } finally {
        setLoadingUsage(false);
      }
    }
    fetchStatus();
  }, [userId]);

  const handleCancelSubscription = async () => {
    setCanceling(true);
    setCancelMessage(null);
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to cancel subscription.');
      }

      setCancelMessage(data.message);
      setShowCancelConfirm(false);
      onSubscriptionUpdated({
        ...subscription,
        cancelAtPeriodEnd: true
      });
    } catch (err: any) {
      setCancelMessage(err.message || 'Error processing cancellation.');
    } finally {
      setCanceling(false);
    }
  };

  const planDef = SUBSCRIPTION_PLANS[subscription.planId] || SUBSCRIPTION_PLANS.free;
  const isPaid = subscription.planId !== 'free';
  const renewalDate = new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const chatUsagePercent = usage && usage.dailyChatLimit > 0
    ? Math.min(100, Math.round((usage.dailyChatCount / usage.dailyChatLimit) * 100))
    : 0;

  const reportUsagePercent = usage && usage.monthlyReportLimit > 0
    ? Math.min(100, Math.round((usage.monthlyReportCount / usage.monthlyReportLimit) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 md:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg">
              💳
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Subscription & Billing Portal</h2>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Current Plan Overview Card */}
        <div className="mt-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-md border border-teal-800/60">
                {subscription.status.toUpperCase()}
              </span>
              <h3 className="text-2xl font-extrabold mt-2 tracking-tight">{planDef.name}</h3>
              <p className="text-xs text-slate-300 capitalize">{subscription.billingInterval} billing cycle</p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Current Period End:</span>
              <div className="text-sm font-bold text-teal-300">{renewalDate}</div>
              {subscription.cancelAtPeriodEnd && (
                <span className="inline-block mt-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Cancels on {renewalDate}
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              {isPaid ? 'Full access to clinical OCR & doctor letter generation active.' : 'Essential health assistance included.'}
            </div>
            <button
              onClick={() => {
                onClose();
                onNavigateToPricing();
              }}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              {isPaid ? 'Change Plan' : 'Upgrade to Premium'}
            </button>
          </div>
        </div>

        {/* Usage Meters */}
        <div className="mt-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resource Consumption & Quotas</h4>

          {loadingUsage ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading current period usage...</div>
          ) : usage ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Daily AI Chats */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-slate-700">Daily AI Consultations</span>
                  <span className="text-slate-900">{usage.dailyChatCount} / {usage.dailyChatLimit}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      chatUsagePercent > 85 ? 'bg-rose-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${chatUsagePercent}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500">Resets daily at Midnight UTC</p>
              </div>

              {/* Monthly Lab Reports */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-slate-700">Monthly Lab Reports</span>
                  <span className="text-slate-900">{usage.monthlyReportCount} / {usage.monthlyReportLimit}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      reportUsagePercent > 85 ? 'bg-rose-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${reportUsagePercent}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500">Resets 1st of next month</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Invoices and Billing Records */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Billing History</h4>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-200 text-xs text-slate-600">
            {isPaid ? (
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">MediMind {planDef.name} ({subscription.billingInterval})</div>
                  <div className="text-[10px] text-slate-500">Paid • ID: {subscription.paymentId || 'TXN_2026_SANDBOX'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">
                    {subscription.billingInterval === 'annual' ? planDef.pricing.INR.annual.displayPrice : planDef.pricing.INR.monthly.displayPrice}
                  </div>
                  <span className="text-[10px] text-teal-600 font-semibold">Verified</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No paid transactions. You are enjoying the MediMind Free Tier.
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Message */}
        {cancelMessage && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium">
            {cancelMessage}
          </div>
        )}

        {/* Cancellation Actions */}
        {isPaid && !subscription.cancelAtPeriodEnd && (
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-700">Cancel Subscription</p>
              <p className="text-[11px] text-slate-400">You will retain full access until {renewalDate}.</p>
            </div>

            {showCancelConfirm ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={canceling}
                  onClick={handleCancelSubscription}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
                >
                  {canceling ? 'Canceling...' : 'Confirm Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 font-semibold"
                >
                  Keep Plan
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
              >
                Cancel Renewal
              </button>
            )}
          </div>
        )}

        {/* Close Button */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
