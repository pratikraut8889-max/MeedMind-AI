import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Medication, MedicationIntakeLog } from '../types';

interface WeeklyAdherenceTrendCardProps {
  medications: Medication[];
  logs: MedicationIntakeLog[];
  darkMode?: boolean;
  highContrast?: boolean;
  onOpenCalendar?: () => void;
  onOpenMyMeds?: () => void;
}

interface WeekDataPoint {
  weekKey: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  score: number; // 0 - 100
  takenDoses: number;
  scheduledDoses: number;
  missedDoses: number;
  status: 'optimal' | 'moderate' | 'needs-attention';
}

interface DayDataPoint {
  dateStr: string;
  dayLabel: string; // "Mon", "Tue", etc.
  dayNum: number;
  isToday: boolean;
  isFuture: boolean;
  scheduledDoses: number;
  takenDoses: number;
  score: number;
  status: 'full' | 'partial' | 'missed' | 'scheduled' | 'none';
}

export const WeeklyAdherenceTrendCard: React.FC<WeeklyAdherenceTrendCardProps> = ({
  medications = [],
  logs = [],
  darkMode = false,
  highContrast = false,
  onOpenCalendar,
  onOpenMyMeds
}) => {
  const [activeTab, setActiveTab] = useState<'trend' | 'days' | 'meds'>('trend');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Quick lookup of logs by dateStr
  const logsByDate = useMemo(() => {
    const map = new Map<string, MedicationIntakeLog[]>();
    for (const log of logs) {
      const existing = map.get(log.takenDate) || [];
      existing.push(log);
      map.set(log.takenDate, existing);
    }
    return map;
  }, [logs]);

  // Calculate past 6 rolling weeks of adherence
  const weeklyTrends = useMemo(() => {
    const weeks: WeekDataPoint[] = [];
    const now = new Date();

    // Find the Monday of current week
    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - distanceToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    // Compute last 6 weeks (from 5 weeks ago to current week)
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      let scheduledDoses = 0;
      let takenDoses = 0;

      // Loop through 7 days of this week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + dayOffset);
        const dStr = d.toISOString().split('T')[0];

        // Only count days up to today
        if (dStr <= todayStr) {
          const dayMedsCount = medications.length;
          scheduledDoses += dayMedsCount;

          const dayLogs = logsByDate.get(dStr) || [];
          const taken = dayLogs.filter((l) => l.status === 'taken').length;
          takenDoses += taken;
        }
      }

      const score = scheduledDoses > 0
        ? Math.min(100, Math.round((takenDoses / scheduledDoses) * 100))
        : 100;

      const missedDoses = Math.max(0, scheduledDoses - takenDoses);

      let status: 'optimal' | 'moderate' | 'needs-attention' = 'optimal';
      if (score < 75) status = 'needs-attention';
      else if (score < 90) status = 'moderate';

      const isCurrentWeek = i === 0;
      const startMonth = weekStart.toLocaleDateString(undefined, { month: 'short' });
      const weekLabel = isCurrentWeek
        ? `This Week (${startMonth} ${weekStart.getDate()})`
        : `${startMonth} ${weekStart.getDate()}`;

      weeks.push({
        weekKey: `w_${startStr}`,
        weekLabel,
        startDate: startStr,
        endDate: endStr,
        score,
        takenDoses,
        scheduledDoses,
        missedDoses,
        status
      });
    }

    return weeks;
  }, [medications, logsByDate, todayStr]);

  // Current week and previous week scores for delta computation
  const currentWeek = weeklyTrends[weeklyTrends.length - 1];
  const previousWeek = weeklyTrends[weeklyTrends.length - 2];

  const currentScore = currentWeek ? currentWeek.score : 100;
  const prevScore = previousWeek ? previousWeek.score : 100;
  const scoreDelta = currentScore - prevScore;

  // Breakdown of Current Week Days (Mon - Sun)
  const currentWeekDays = useMemo(() => {
    const days: DayDataPoint[] = [];
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - distanceToMonday);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const isToday = dStr === todayStr;
      const isFuture = dStr > todayStr;

      const dayLogs = logsByDate.get(dStr) || [];
      const scheduled = medications.length;
      const taken = dayLogs.filter((l) => l.status === 'taken').length;

      let status: 'full' | 'partial' | 'missed' | 'scheduled' | 'none';
      if (scheduled === 0) {
        status = 'none';
      } else if (isFuture) {
        status = 'scheduled';
      } else if (taken >= scheduled) {
        status = 'full';
      } else if (taken > 0) {
        status = 'partial';
      } else if (dStr < todayStr) {
        status = 'missed';
      } else {
        status = 'scheduled';
      }

      const score = scheduled > 0 ? Math.min(100, Math.round((taken / scheduled) * 100)) : 100;

      days.push({
        dateStr: dStr,
        dayLabel: dayLabels[i],
        dayNum: d.getDate(),
        isToday,
        isFuture,
        scheduledDoses: scheduled,
        takenDoses: taken,
        score,
        status
      });
    }

    return days;
  }, [medications, logsByDate, todayStr]);

  // Per-Medication Adherence Breakdown for Current Week
  const perMedicationAdherence = useMemo(() => {
    if (!currentWeek || medications.length === 0) return [];

    return medications.map((med) => {
      let medScheduled = 0;
      let medTaken = 0;

      currentWeekDays.forEach((day) => {
        if (!day.isFuture) {
          medScheduled += 1;
          const dayLogs = logsByDate.get(day.dateStr) || [];
          const isTaken = dayLogs.some((l) => l.medicationId === med.id && l.status === 'taken');
          if (isTaken) medTaken += 1;
        }
      });

      const rate = medScheduled > 0 ? Math.min(100, Math.round((medTaken / medScheduled) * 100)) : 100;

      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        time: med.time,
        rate,
        taken: medTaken,
        scheduled: medScheduled
      };
    });
  }, [medications, currentWeek, currentWeekDays, logsByDate]);

  // Streak Calculation
  const adherenceStreak = useMemo(() => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayLogs = logsByDate.get(dStr) || [];
      const scheduled = medications.length;
      if (scheduled === 0) continue;
      const taken = dayLogs.filter((l) => l.status === 'taken').length;
      if (taken >= scheduled) {
        streak++;
      } else {
        if (i === 0 && taken === 0) continue; // Don't break if today is in progress
        break;
      }
    }
    return streak;
  }, [medications, logsByDate]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WeekDataPoint = payload[0].payload;
      return (
        <div
          className={`p-3 rounded-2xl shadow-xl border text-xs space-y-1 ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="font-bold flex items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
            <span>{data.weekLabel}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md font-extrabold ${
                data.score >= 90
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : data.score >= 75
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {data.score}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1">
            <div className="flex justify-between gap-4">
              <span>Doses Taken:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.takenDoses}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Scheduled:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.scheduledDoses}</span>
            </div>
            {data.missedDoses > 0 && (
              <div className="flex justify-between gap-4 text-rose-500 font-bold">
                <span>Missed Doses:</span>
                <span>{data.missedDoses}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const cardBg = highContrast
    ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
    : darkMode
    ? 'bg-slate-900/90 border border-slate-800 text-white'
    : 'bg-white border border-slate-200 shadow-sm text-slate-800';

  return (
    <div className={`p-5 sm:p-6 rounded-3xl transition-all space-y-5 ${cardBg}`} id="weekly-adherence-trend-card">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-500/20 shrink-0">
            <i className="fas fa-chart-line"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Prescription Intelligence
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Weekly Adherence Score
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
              Medication Adherence Trend
            </h2>
          </div>
        </div>

        {/* View Mode Toggle Tabs & Calendar Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              id="tab-weekly-trend"
              onClick={() => setActiveTab('trend')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'trend'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              6-Week Trend
            </button>
            <button
              type="button"
              id="tab-weekly-days"
              onClick={() => setActiveTab('days')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'days'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              This Week (Days)
            </button>
            <button
              type="button"
              id="tab-weekly-meds"
              onClick={() => setActiveTab('meds')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'meds'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              By Medication
            </button>
          </div>

          {onOpenCalendar && (
            <button
              type="button"
              id="open-calendar-from-trend-card"
              onClick={onOpenCalendar}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Open full interactive Medication Calendar"
            >
              <i className="fas fa-calendar-check text-[11px]"></i>
              <span className="hidden sm:inline">Open Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Adherence KPI Score Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Current Week Adherence Score */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            This Week's Score
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                currentScore >= 90
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : currentScore >= 75
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {currentScore}%
            </span>
            {scoreDelta !== 0 && (
              <span
                className={`text-[11px] font-bold flex items-center gap-0.5 ${
                  scoreDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                <i className={`fas fa-arrow-${scoreDelta > 0 ? 'up' : 'down'} text-[9px]`}></i>
                {Math.abs(scoreDelta)}%
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {currentWeek?.takenDoses || 0} of {currentWeek?.scheduledDoses || 0} doses logged
          </span>
        </div>

        {/* KPI 2: Consecutive Adherence Streak */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Adherence Streak
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">
              {adherenceStreak}
            </span>
            <span className="text-xs font-semibold text-slate-500">Days</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {adherenceStreak >= 7 ? 'High clinical consistency' : 'Maintain daily routine'}
          </span>
        </div>

        {/* KPI 3: Missed Doses Alert */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Missed This Week
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                (currentWeek?.missedDoses || 0) === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}
            >
              {currentWeek?.missedDoses || 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">doses</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {(currentWeek?.missedDoses || 0) === 0 ? 'Optimal therapeutic window' : 'Review scheduled times'}
          </span>
        </div>

        {/* KPI 4: Active Regimens Monitored */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Active Prescriptions
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {medications.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">regimens</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Scheduled reminders</span>
            {onOpenMyMeds && (
              <button
                type="button"
                onClick={onOpenMyMeds}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
              >
                Manage Rx →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Tab Content */}
      {activeTab === 'trend' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              6-Week Adherence Percentage Trajectory
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Target Adherence: <strong className="text-emerald-600">≥ 85%</strong>
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adherenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis
                  dataKey="weekLabel"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }}
                />
                <YAxis
                  domain={[50, 100]}
                  ticks={[50, 65, 80, 90, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }}
                  unit="%"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#adherenceGradient)"
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'days' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Week Daily Dose Status (Monday - Sunday)
            </h3>
            <span className="text-xs text-slate-500">Tap day on calendar for detailed intake log</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {currentWeekDays.map((d) => (
              <div
                key={d.dateStr}
                onClick={onOpenCalendar}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                  d.isToday
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500'
                    : d.status === 'full'
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                    : d.status === 'missed'
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {d.dayLabel}
                </span>
                <span className="text-sm sm:text-base font-extrabold mt-0.5 block">
                  {d.dayNum}
                </span>

                <div className="mt-2">
                  {d.status === 'full' ? (
                    <span className="w-6 h-6 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                      <i className="fas fa-check"></i>
                    </span>
                  ) : d.status === 'partial' ? (
                    <span className="w-6 h-6 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">
                      <i className="fas fa-exclamation"></i>
                    </span>
                  ) : d.status === 'missed' ? (
                    <span className="w-6 h-6 mx-auto rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">
                      <i className="fas fa-times"></i>
                    </span>
                  ) : (
                    <span className="w-6 h-6 mx-auto rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs">
                      <i className="far fa-clock"></i>
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-semibold text-slate-500 mt-1 block">
                  {d.isFuture ? 'Scheduled' : `${d.takenDoses}/${d.scheduledDoses}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'meds' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Individual Prescription Compliance (This Week)
            </h3>
            <span className="text-xs text-slate-500">{perMedicationAdherence.length} regimens evaluated</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {perMedicationAdherence.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm">{item.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {item.dosage} • Scheduled: {item.time || 'Daily'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-xl text-xs font-black ${
                      item.rate >= 90
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.rate >= 75
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {item.rate}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.rate >= 90 ? 'bg-emerald-500' : item.rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.rate}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{item.taken} of {item.scheduled} doses logged</span>
                  <span>{item.scheduled - item.taken === 0 ? 'All doses taken' : `${item.scheduled - item.taken} missed`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Adherence Insight Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
            <i className="fas fa-shield-heart"></i>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">
              {currentScore >= 90
                ? 'High Adherence Window (Optimal)'
                : currentScore >= 75
                ? 'Moderate Adherence (Attention Advised)'
                : 'Adherence Deficit Detected'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {currentScore >= 90
                ? 'Consistency maintains therapeutic blood concentration and reduces cardiovascular or symptom volatility.'
                : 'Consistent dosing times prevent rebound hypertension and maintain clinical efficacy.'}
            </p>
          </div>
        </div>

        {onOpenCalendar && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Audit Calendar Intake</span>
            <i className="fas fa-arrow-right text-[10px]"></i>
          </button>
        )}
      </div>
    </div>
  );
};
