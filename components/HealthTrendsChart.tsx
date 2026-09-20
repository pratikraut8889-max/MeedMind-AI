import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { HealthMetricEntry } from '../types';

interface HealthTrendsChartProps {
  metrics: HealthMetricEntry[];
  onSaveMetrics: (metrics: HealthMetricEntry[]) => void;
  darkMode: boolean;
  highContrast: boolean;
}

type MetricTab = 'bp' | 'heartRate' | 'glucose' | 'weight';

export const HealthTrendsChart: React.FC<HealthTrendsChartProps> = ({
  metrics = [],
  onSaveMetrics,
  darkMode,
  highContrast
}) => {
  const [activeTab, setActiveTab] = useState<MetricTab>('bp');
  const [showLogModal, setShowLogModal] = useState(false);

  // Form states for new entry
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [heartRate, setHeartRate] = useState('72');
  const [glucose, setGlucose] = useState('95');
  const [weight, setWeight] = useState('70');
  const [note, setNote] = useState('');

  // Default sample data generator if metrics are empty
  const getDefaultSampleMetrics = (): HealthMetricEntry[] => {
    const baseDate = new Date();
    const samples: HealthMetricEntry[] = [];
    const sampleReadings = [
      { dayOffset: 6, sys: 128, dia: 84, hr: 76, glu: 104, wt: 71.2, note: 'Morning fasting' },
      { dayOffset: 5, sys: 125, dia: 82, hr: 74, glu: 99, wt: 71.0, note: 'Post breakfast walk' },
      { dayOffset: 4, sys: 122, dia: 80, hr: 71, glu: 96, wt: 70.8, note: 'Routine check' },
      { dayOffset: 3, sys: 126, dia: 83, hr: 75, glu: 102, wt: 70.6, note: 'Evening check' },
      { dayOffset: 2, sys: 120, dia: 79, hr: 70, glu: 94, wt: 70.5, note: 'Resting morning' },
      { dayOffset: 1, sys: 119, dia: 78, hr: 68, glu: 92, wt: 70.3, note: 'Low stress day' },
      { dayOffset: 0, sys: 118, dia: 77, hr: 69, glu: 91, wt: 70.2, note: 'Current baseline' },
    ];

    sampleReadings.forEach(r => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - r.dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      samples.push({
        id: `sample-${r.dayOffset}`,
        date: dateStr,
        time: '08:30',
        systolic: r.sys,
        diastolic: r.dia,
        heartRate: r.hr,
        bloodGlucose: r.glu,
        weight: r.wt,
        notes: r.note
      });
    });

    return samples;
  };

  const displayData = metrics.length > 0 ? metrics : getDefaultSampleMetrics();
  const isUsingSample = metrics.length === 0;

  // Sort chronological for chart display
  const sortedData = [...displayData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Formatting helper for chart data points
  const chartData = sortedData.map(d => {
    // Format date MM/DD
    const parts = d.date.split('-');
    const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
    return {
      ...d,
      displayDate: label,
      fullDate: d.date,
    };
  });

  // Calculate Blood Pressure Category for a given systolic & diastolic
  const getBPCategory = (sys?: number, dia?: number) => {
    if (!sys || !dia) return { label: 'Incomplete', color: 'text-slate-400', bg: 'bg-slate-100' };
    if (sys < 120 && dia < 80) {
      return { label: 'Normal (<120 / <80)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    }
    if (sys <= 129 && dia < 80) {
      return { label: 'Elevated (120-129 / <80)', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    }
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      return { label: 'Stage 1 Hypertension', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
    }
    return { label: 'Stage 2 Hypertension (≥140 / ≥90)', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  };

  // Latest reading calculation
  const latest = sortedData[sortedData.length - 1];
  const bpStatus = getBPCategory(latest?.systolic, latest?.diastolic);

  // Averages calculation
  const avgSys = Math.round(sortedData.reduce((acc, c) => acc + (c.systolic || 0), 0) / sortedData.length);
  const avgDia = Math.round(sortedData.reduce((acc, c) => acc + (c.diastolic || 0), 0) / sortedData.length);
  const avgHR = Math.round(sortedData.reduce((acc, c) => acc + (c.heartRate || 0), 0) / sortedData.length);
  const avgGlu = Math.round(sortedData.reduce((acc, c) => acc + (c.bloodGlucose || 0), 0) / sortedData.length);

  const handleSaveReading = () => {
    const s = parseInt(systolic, 10);
    const d = parseInt(diastolic, 10);
    const hr = heartRate ? parseInt(heartRate, 10) : undefined;
    const glu = glucose ? parseFloat(glucose) : undefined;
    const wt = weight ? parseFloat(weight) : undefined;

    if (isNaN(s) || isNaN(d)) {
      alert('Please enter valid systolic and diastolic blood pressure values.');
      return;
    }

    const newEntry: HealthMetricEntry = {
      id: Date.now().toString(),
      date: formDate,
      time: formTime,
      systolic: s,
      diastolic: d,
      heartRate: hr && !isNaN(hr) ? hr : undefined,
      bloodGlucose: glu && !isNaN(glu) ? glu : undefined,
      weight: wt && !isNaN(wt) ? wt : undefined,
      notes: note.trim() || undefined
    };

    // If previously empty, we now start real user list
    const updated = [...metrics, newEntry];
    onSaveMetrics(updated);
    setShowLogModal(false);
    setNote('');
  };

  const handleClearData = () => {
    if (window.confirm('Clear all custom health readings?')) {
      onSaveMetrics([]);
    }
  };

  const cardBg = highContrast
    ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
    : darkMode
    ? 'bg-slate-800 border border-slate-700 text-white'
    : 'bg-white border border-slate-100 shadow-sm text-slate-800';

  const gridColor = darkMode ? '#334155' : '#e2e8f0';
  const textColor = darkMode ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <i className="fas fa-chart-line text-sm"></i>
          </div>
          <div>
            <h3 className="font-bold text-base">Health Metrics & Trends</h3>
            <p className="text-xs opacity-60">Track blood pressure, heart rate, and vitals over time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {metrics.length > 0 && (
            <button
              onClick={handleClearData}
              title="Clear custom readings"
              className="p-2 rounded-xl text-xs opacity-60 hover:opacity-100 hover:text-red-500 transition"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          )}
          <button
            id="log-vitals-btn"
            onClick={() => setShowLogModal(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <i className="fas fa-plus text-[10px]"></i> Log Reading
          </button>
        </div>
      </div>

      {isUsingSample && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-500"></i>
            <span>Displaying 7-day starter trend. Click <strong>Log Reading</strong> to track your personal vitals.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-700/50">
        <button
          onClick={() => setActiveTab('bp')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'bp'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <i className="fas fa-heart-pulse"></i> Blood Pressure
        </button>
        <button
          onClick={() => setActiveTab('heartRate')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'heartRate'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <i className="fas fa-wave-square"></i> Heart Rate
        </button>
        <button
          onClick={() => setActiveTab('glucose')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'glucose'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <i className="fas fa-droplet"></i> Glucose
        </button>
        <button
          onClick={() => setActiveTab('weight')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'weight'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <i className="fas fa-weight-scale"></i> Weight
        </button>
      </div>

      {/* Metric Summary Card */}
      <div className={`p-4 rounded-2xl border ${cardBg}`}>
        {activeTab === 'bp' && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">Latest BP Reading</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono">
                  {latest?.systolic}/{latest?.diastolic}
                </span>
                <span className="text-xs opacity-60">mmHg</span>
                <span className="text-xs opacity-40 ml-1">({latest?.date})</span>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${bpStatus.bg} ${bpStatus.color}`}>
              <i className="fas fa-shield-heart"></i>
              <span>{bpStatus.label}</span>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">7-Day Average</p>
              <p className="text-sm font-bold font-mono">{avgSys} / {avgDia} mmHg</p>
            </div>
          </div>
        )}

        {activeTab === 'heartRate' && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">Latest Resting Heart Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono">{latest?.heartRate || '--'}</span>
                <span className="text-xs opacity-60">BPM</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">Average Heart Rate</p>
              <p className="text-sm font-bold font-mono">{avgHR || '--'} BPM</p>
            </div>
          </div>
        )}

        {activeTab === 'glucose' && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">Latest Blood Glucose</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono">{latest?.bloodGlucose || '--'}</span>
                <span className="text-xs opacity-60">mg/dL</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">Average Glucose</p>
              <p className="text-sm font-bold font-mono">{avgGlu || '--'} mg/dL</p>
            </div>
          </div>
        )}

        {activeTab === 'weight' && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">Latest Weight</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono">{latest?.weight || '--'}</span>
                <span className="text-xs opacity-60">kg</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase font-bold tracking-wider opacity-60">Data points</p>
              <p className="text-sm font-bold font-mono">{sortedData.length} records</p>
            </div>
          </div>
        )}

        {/* Chart Visualization */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'bp' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="displayDate" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis domain={[60, 160]} stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: darkMode ? '#ffffff' : '#0f172a'
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} mmHg`,
                    name === 'systolic' ? 'Systolic (SYS)' : 'Diastolic (DIA)'
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${item.fullDate} ${item.time || ''} ${item.notes ? '• ' + item.notes : ''}` : label;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                {/* Clinical Guideline Reference Lines */}
                <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Target Max Sys (120)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Target Max Dia (80)', position: 'insideBottomRight', fill: '#3b82f6', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : activeTab === 'heartRate' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="displayDate" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis domain={[50, 120]} stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value} BPM`, 'Heart Rate']}
                />
                <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Max Normal (100)', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={60} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Min Normal (60)', fill: '#10b981', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate"
                  stroke="#ec4899"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ec4899' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : activeTab === 'glucose' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="displayDate" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis domain={[70, 150]} stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value} mg/dL`, 'Blood Glucose']}
                />
                <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Normal Fasting Max (100)', fill: '#f59e0b', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="bloodGlucose"
                  name="Glucose"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#8b5cf6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="displayDate" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value} kg`, 'Body Weight']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="Weight"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Clinical Guideline Legend */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-[11px] opacity-70 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal &lt;120/80</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Elevated 120-129</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Stage 1 130-139</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Stage 2 &ge;140/90</span>
          </div>
          <span>AHA/ACC Guidelines</span>
        </div>
      </div>

      {/* Log Reading Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl relative shadow-2xl ${cardBg}`}>
            <button
              onClick={() => setShowLogModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg">
                <i className="fas fa-notes-medical"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold">Log Health Metric</h3>
                <p className="text-xs opacity-60">Record your blood pressure and vitals</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-sm outline-none ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">Time</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-sm outline-none ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Blood Pressure Inputs */}
              <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                <label className="block text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-2">
                  Blood Pressure (mmHg) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] opacity-60 mb-0.5">Systolic (Upper)</label>
                    <input
                      type="number"
                      placeholder="e.g. 120"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-sm font-mono font-bold ${
                        darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] opacity-60 mb-0.5">Diastolic (Lower)</label>
                    <input
                      type="number"
                      placeholder="e.g. 80"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-sm font-mono font-bold ${
                        darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Real-time category calculation preview */}
                {systolic && diastolic && (
                  <div className="mt-2.5 text-xs flex items-center justify-between">
                    <span className="opacity-60">Status:</span>
                    <span className={`font-bold ${getBPCategory(parseInt(systolic), parseInt(diastolic)).color}`}>
                      {getBPCategory(parseInt(systolic), parseInt(diastolic)).label}
                    </span>
                  </div>
                )}
              </div>

              {/* Other Vitals */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Heart Rate</label>
                  <input
                    type="number"
                    placeholder="BPM"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs font-mono ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Glucose</label>
                  <input
                    type="number"
                    placeholder="mg/dL"
                    value={glucose}
                    onChange={(e) => setGlucose(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs font-mono ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Weight</label>
                  <input
                    type="number"
                    placeholder="kg"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs font-mono ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. After morning run, before taking meds"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm outline-none ${
                    darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLogModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
              >
                Save Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
