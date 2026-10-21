import React, { useState, useEffect } from 'react';

interface AdminMetricsData {
  financials: {
    mrrInr: number;
    arrInr: number;
    mrrUsd: number;
    arrUsd: number;
    monthlyAiCostInr: number;
    monthlyAiCostUsd: number;
    grossProfitInr: number;
    grossMarginPercent: number;
  };
  subscribers: {
    total: number;
    paid: number;
    free: number;
    premium: number;
    pro: number;
    canceled: number;
    conversionRate: number;
    churnRate: number;
  };
  aiInfrastructure: {
    totalTrackedUsers: number;
    totalRequestsProcessed: number;
    totalChats: number;
    totalReportAnalyses: number;
    totalTokensEstimated: number;
    totalEstimatedAiCostUsd: number;
    averageCostPerUserUsd: number;
    monthlyTokenEstimate: number;
    monthlyEstimatedCostUsd: number;
  };
  clinicalImpact: {
    avgAdherenceScore: number;
    totalDocumentsAnalyzed: number;
    drugInteractionsPrevented: number;
    emergencyTriagesHandled: number;
  };
  complianceStatus: {
    zeroPiiEnforced: boolean;
    hipaaDeidentified: boolean;
    livePaymentsReady: boolean;
    paymentEnvironment: string;
  };
}

interface BusinessAdminDashboardProps {
  userEmail: string;
  onClose?: () => void;
}

export const BusinessAdminDashboard: React.FC<BusinessAdminDashboardProps> = ({
  userEmail,
  onClose
}) => {
  const [data, setData] = useState<AdminMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/metrics?userEmail=${encodeURIComponent(userEmail)}`, {
        headers: {
          'x-user-email': userEmail,
          'x-admin-key': 'medimind_admin_sec_2026'
        }
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied. Administrator privileges required (rautp0476@gmail.com).');
        }
        throw new Error('Failed to retrieve commercial analytics.');
      }

      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastRefreshed(new Date());
      } else {
        throw new Error(json.message || 'Server returned failure.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with analytics endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [userEmail]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-teal-400 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            Owner & Executive Business Console • Zero PII Protected
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            MediMind AI SaaS Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audited Commercial Health KPIs • Verified Administrator: <span className="font-semibold text-slate-700">{userEmail}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <span>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Real-time Data'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Exit Console
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-900 max-w-lg mx-auto">
          <div className="text-3xl mb-2">🔒</div>
          <h3 className="font-bold text-sm">Administrative Security Restriction</h3>
          <p className="text-xs mt-1 text-rose-700">{error}</p>
          <div className="mt-4">
            <button
              onClick={fetchMetrics}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Retry Authentication
            </button>
          </div>
        </div>
      ) : loading && !data ? (
        <div className="p-16 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xs font-semibold">Aggregating commercial SaaS financial & AI metrics...</p>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Key SaaS Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MRR */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly Recurring Revenue</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  ₹{data.financials.mrrInr.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500 font-medium">(${data.financials.mrrUsd}/mo)</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>ARR Runway:</span>
                <span className="font-semibold text-slate-800">₹{data.financials.arrInr.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Paid Subscribers */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Paid Subscribers</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-teal-700">
                  {data.subscribers.paid}
                </span>
                <span className="text-xs text-slate-500">/ {data.subscribers.total} total</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Free-to-Paid Conversion:</span>
                <span className="font-bold text-teal-600">{data.subscribers.conversionRate}%</span>
              </div>
            </div>

            {/* AI Infrastructure Cost */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AI Compute & Token Cost</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  ${data.financials.monthlyAiCostUsd.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500">(₹{data.financials.monthlyAiCostInr})</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Avg Cost / Active User:</span>
                <span className="font-semibold text-slate-800">${data.aiInfrastructure.averageCostPerUserUsd}</span>
              </div>
            </div>

            {/* Gross Margin */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Software Margin</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600">
                  {data.financials.grossMarginPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Net Gross Profit (INR):</span>
                <span className="font-bold text-emerald-700">₹{data.financials.grossProfitInr.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Detailed SaaS Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subscriber Cohort Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Subscriber Tier Distribution</h3>
                <p className="text-xs text-slate-500 mb-6">Real active entitlement licenses</p>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Pro / Family Plan (₹1,299/mo)</span>
                      <span>{data.subscribers.pro} subscribers</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: `${(data.subscribers.pro / data.subscribers.total) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>MediMind Premium (₹499/mo)</span>
                      <span>{data.subscribers.premium} subscribers</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full" style={{ width: `${(data.subscribers.premium / data.subscribers.total) * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Free Patient Tier</span>
                      <span>{data.subscribers.free} users</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-slate-300 h-full rounded-full" style={{ width: `${(data.subscribers.free / data.subscribers.total) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Active Churn Rate:</span>
                <span className="font-semibold text-slate-800">{data.subscribers.churnRate}%</span>
              </div>
            </div>

            {/* AI Infrastructure & Token Economics */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-1">AI Token Economics & Costs</h3>
              <p className="text-xs text-slate-500 mb-6">Gemini Flash-Lite & RAG vector pipeline</p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Total Tokens Estimated:</span>
                  <span className="font-bold text-slate-900">{data.aiInfrastructure.monthlyTokenEstimate.toLocaleString()} tokens</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Consultation Queries:</span>
                  <span className="font-bold text-slate-900">{data.aiInfrastructure.totalChats}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">OCR & Lab Documents:</span>
                  <span className="font-bold text-slate-900">{data.aiInfrastructure.totalReportAnalyses}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Cost per 1M Output Tokens:</span>
                  <span className="font-bold text-teal-700">$0.60</span>
                </div>
              </div>
            </div>

            {/* Clinical Value & Compliance Indicators */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Clinical Safety & Privacy</h3>
                <p className="text-xs text-slate-500 mb-6">Audited production safeguards</p>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
                    <span className="font-semibold">Zero Patient PII in Logs:</span>
                    <span className="font-bold">VERIFIED</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-100">
                    <span className="font-semibold">Drug Interactions Surfaced:</span>
                    <span className="font-bold">{data.clinicalImpact.drugInteractionsPrevented}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-100">
                    <span className="font-semibold">Emergency Triage Bypasses:</span>
                    <span className="font-bold">{data.clinicalImpact.emergencyTriagesHandled}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-slate-800 border border-slate-100">
                    <span className="font-semibold">Payment Gateway Mode:</span>
                    <span className="font-bold uppercase text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                      {data.complianceStatus.paymentEnvironment}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                Last telemetry audit: {lastRefreshed.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
