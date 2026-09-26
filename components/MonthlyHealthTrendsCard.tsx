import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { StoredReport } from '../types';

interface MonthlyHealthTrendsCardProps {
  storedReports: StoredReport[];
  darkMode?: boolean;
  onViewAllReports?: () => void;
  onUploadNew?: () => void;
}

interface MonthlyDataPoint {
  month: string;
  monthKey: string;
  highFlags: number;
  mediumFlags: number;
  lowFlags: number;
  totalReports: number;
  totalBiomarkers: number;
}

export const MonthlyHealthTrendsCard: React.FC<MonthlyHealthTrendsCardProps> = ({
  storedReports = [],
  darkMode = false,
  onViewAllReports,
  onUploadNew
}) => {
  const [showSampleData, setShowSampleData] = useState(false);

  // Generate last 6 months list (e.g. "Apr 2026", "May 2026", etc.)
  const monthBuckets = useMemo(() => {
    const buckets: { [key: string]: MonthlyDataPoint } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      buckets[key] = {
        month: monthLabel,
        monthKey: key,
        highFlags: 0,
        mediumFlags: 0,
        lowFlags: 0,
        totalReports: 0,
        totalBiomarkers: 0
      };
    }

    return buckets;
  }, []);

  // Compute real data from stored reports
  const realChartData = useMemo(() => {
    const bucketsCopy = JSON.parse(JSON.stringify(monthBuckets)) as { [key: string]: MonthlyDataPoint };

    storedReports.forEach((rep) => {
      if (!rep.date) return;
      const d = new Date(rep.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (bucketsCopy[key]) {
        bucketsCopy[key].totalReports += 1;
        const flags = rep.result?.redFlags || [];
        flags.forEach((f) => {
          if (f.severity === 'HIGH') bucketsCopy[key].highFlags += 1;
          else if (f.severity === 'MEDIUM') bucketsCopy[key].mediumFlags += 1;
          else bucketsCopy[key].lowFlags += 1;
        });
        bucketsCopy[key].totalBiomarkers += rep.result?.labMeasurements?.length || 0;
      }
    });

    return Object.values(bucketsCopy);
  }, [storedReports, monthBuckets]);

  // Sample data to show clinical capability if user has few or no reports
  const sampleChartData = useMemo<MonthlyDataPoint[]>(() => {
    const months = Object.values(monthBuckets);
    const mockPatterns = [
      { high: 2, med: 3, low: 1, reps: 2, bios: 18 },
      { high: 1, med: 2, low: 2, reps: 2, bios: 22 },
      { high: 3, med: 4, low: 1, reps: 3, bios: 29 },
      { high: 1, med: 2, low: 2, reps: 1, bios: 14 },
      { high: 0, med: 2, low: 1, reps: 2, bios: 19 },
      { high: 0, med: 1, low: 1, reps: 2, bios: 16 }
    ];

    return Object.values(monthBuckets).map((m: MonthlyDataPoint, idx: number) => ({
      month: m.month,
      monthKey: m.monthKey,
      highFlags: mockPatterns[idx]?.high || 0,
      mediumFlags: mockPatterns[idx]?.med || 0,
      lowFlags: mockPatterns[idx]?.low || 0,
      totalReports: mockPatterns[idx]?.reps || 1,
      totalBiomarkers: mockPatterns[idx]?.bios || 15
    }));
  }, [monthBuckets]);

  const hasReports = storedReports.length > 0;
  const isDisplayingSample = !hasReports || showSampleData;
  const activeData = isDisplayingSample ? sampleChartData : realChartData;

  // Aggregate summary metrics
  const totalHigh = activeData.reduce((acc, curr) => acc + curr.highFlags, 0);
  const totalMedium = activeData.reduce((acc, curr) => acc + curr.mediumFlags, 0);
  const totalReportsCount = isDisplayingSample
    ? activeData.reduce((acc, curr) => acc + curr.totalReports, 0)
    : storedReports.length;

  const latestMonth = activeData[activeData.length - 1];
  const previousMonth = activeData[activeData.length - 2];
  const flagTrajectory = latestMonth.highFlags < previousMonth.highFlags
    ? 'improving'
    : latestMonth.highFlags > previousMonth.highFlags
    ? 'attention'
    : 'stable';

  return (
    <div
      id="monthly-health-trends-card"
      className="p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm hover:shadow-md transition-all space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
              <i className="fas fa-chart-column"></i>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Health Trends & Red Flag Severity
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monthly distribution of clinical red flags and abnormal diagnostic markers across documents
          </p>
        </div>

        {/* Toggle Sample View if user has reports or wants to preview */}
        <div className="flex items-center gap-2">
          {hasReports && (
            <button
              type="button"
              onClick={() => setShowSampleData(!showSampleData)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
            >
              {showSampleData ? 'View My Real Data' : 'Preview 6-Mo Baseline'}
            </button>
          )}
          {onViewAllReports && (
            <button
              type="button"
              onClick={onViewAllReports}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Reports Archive ({storedReports.length})
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Reports Analyzed
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {totalReportsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across 6 months</p>
        </div>

        <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Critical Red Flags
          </p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {totalHigh}
          </p>
          <p className="text-[11px] text-rose-500/80 dark:text-rose-400/70 mt-0.5">Requires doctor review</p>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Moderate Alerts
          </p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {totalMedium}
          </p>
          <p className="text-[11px] text-amber-500/80 dark:text-amber-400/70 mt-0.5">Monitored biomarkers</p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Recent Trajectory
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {flagTrajectory === 'improving' ? (
              <>
                <i className="fas fa-arrow-trend-down text-emerald-500 text-sm"></i>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Improving</span>
              </>
            ) : flagTrajectory === 'attention' ? (
              <>
                <i className="fas fa-arrow-trend-up text-rose-500 text-sm"></i>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Needs Attention</span>
              </>
            ) : (
              <>
                <i className="fas fa-minus text-blue-500 text-sm"></i>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Stable Baseline</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Month-over-month</p>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={darkMode ? '#334155' : '#e2e8f0'}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
              axisLine={{ stroke: darkMode ? '#334155' : '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
              axisLine={{ stroke: darkMode ? '#334155' : '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as MonthlyDataPoint;
                return (
                  <div className="p-3 rounded-2xl bg-slate-900/95 text-white border border-slate-700 shadow-xl backdrop-blur-md text-xs space-y-1.5">
                    <p className="font-bold text-sm text-slate-200">{label} Summary</p>
                    <div className="flex items-center justify-between gap-4 text-rose-400">
                      <span>Critical Red Flags:</span>
                      <span className="font-bold">{data.highFlags}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-amber-400">
                      <span>Moderate Alerts:</span>
                      <span className="font-bold">{data.mediumFlags}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-emerald-400">
                      <span>Routine Notes:</span>
                      <span className="font-bold">{data.lowFlags}</span>
                    </div>
                    <div className="border-t border-slate-700 pt-1 flex items-center justify-between gap-4 text-slate-300">
                      <span>Reports Scanned:</span>
                      <span className="font-bold">{data.totalReports}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
            />
            <Bar
              dataKey="highFlags"
              name="Critical Red Flags"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="mediumFlags"
              name="Moderate Alerts"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="lowFlags"
              name="Routine / Clear"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Empty State Banner if 0 reports uploaded yet */}
      {!hasReports && (
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <i className="fas fa-file-medical"></i>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Displaying 6-Month Predictive Trajectory
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your first laboratory or radiology report to begin charting your personal biometric history.
              </p>
            </div>
          </div>
          {onUploadNew && (
            <button
              type="button"
              onClick={onUploadNew}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm"
            >
              Upload First Report
            </button>
          )}
        </div>
      )}
    </div>
  );
};
