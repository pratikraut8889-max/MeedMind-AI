import React, { useState, useMemo } from 'react';
import { StoredReport } from '../types';
import { PDFExportService } from '../services/pdfExportService';
import { GeminiService } from '../services/geminiService';
import { Button } from './SharedComponents';

interface SavedReportsViewProps {
  reports: StoredReport[];
  onSelectReport: (report: StoredReport) => void;
  onDeleteReport: (id: string) => void;
  onClearAll: () => void;
  onBack: () => void;
  onUpdateReport?: (report: StoredReport) => void;
  darkMode: boolean;
  highContrast: boolean;
  location?: string;
}

export const SavedReportsView: React.FC<SavedReportsViewProps> = ({
  reports,
  onSelectReport,
  onDeleteReport,
  onClearAll,
  onBack,
  onUpdateReport,
  darkMode,
  highContrast,
  location
}) => {
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days' | '90days' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [redFlagFilter, setRedFlagFilter] = useState<'all' | 'red_flags' | 'high_only' | 'clear_only'>('all');
  const [selectedLabTest, setSelectedLabTest] = useState<string | null>(null);

  // Multi-select for Batch Export
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isExportingBatch, setIsExportingBatch] = useState(false);

  // Quick High-Level Summary Generation States
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [localSummaries, setLocalSummaries] = useState<Record<string, string>>({});

  // Detail View Modal
  const [detailReport, setDetailReport] = useState<StoredReport | null>(null);

  // Toast / Status Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Helper to check red flag status
  const getRedFlagStatus = (report: StoredReport) => {
    const flags = report.result?.redFlags || [];
    const hasHigh = flags.some((f) => f.severity === 'HIGH');
    const hasMed = flags.some((f) => f.severity === 'MEDIUM');
    const hasAny = flags.length > 0;
    return { flags, hasHigh, hasMed, hasAny, count: flags.length };
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // 1. Text Search (file name, summary, lab markers, date string)
      const query = searchTerm.toLowerCase().trim();
      const reportDate = new Date(r.date);
      const formattedDate = reportDate.toLocaleDateString();
      const formattedLongDate = reportDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      const dateIso = reportDate.toISOString().split('T')[0];

      if (query) {
        const nameMatch = (r.fileName || '').toLowerCase().includes(query);
        const summaryMatch = (r.result?.summary || '').toLowerCase().includes(query);
        const quickSummaryMatch = (r.quickSummary || localSummaries[r.id] || '').toLowerCase().includes(query);
        const labMatch = r.result?.labMeasurements?.some((l) => l.test.toLowerCase().includes(query));
        const dateMatch =
          formattedDate.toLowerCase().includes(query) ||
          formattedLongDate.toLowerCase().includes(query) ||
          dateIso.includes(query);

        if (!nameMatch && !summaryMatch && !quickSummaryMatch && !labMatch && !dateMatch) {
          return false;
        }
      }

      // 2. Date Filter
      if (dateFilter !== 'all') {
        const now = Date.now();
        const diffDays = (now - r.date) / (1000 * 60 * 60 * 24);

        if (dateFilter === 'today') {
          const todayIso = new Date().toISOString().split('T')[0];
          if (dateIso !== todayIso) return false;
        } else if (dateFilter === '7days' && diffDays > 7) {
          return false;
        } else if (dateFilter === '30days' && diffDays > 30) {
          return false;
        } else if (dateFilter === '90days' && diffDays > 90) {
          return false;
        } else if (dateFilter === 'custom' && customDate) {
          if (dateIso !== customDate) return false;
        }
      }

      // 3. Red Flag Filter
      const { hasHigh, hasAny } = getRedFlagStatus(r);
      if (redFlagFilter === 'red_flags' && !hasAny) return false;
      if (redFlagFilter === 'high_only' && !hasHigh) return false;
      if (redFlagFilter === 'clear_only' && hasAny) return false;

      return true;
    });
  }, [reports, searchTerm, dateFilter, customDate, redFlagFilter, localSummaries]);

  // Extract all unique lab tests that appear across reports
  const allLabTests = useMemo(() => {
    return Array.from(
      new Set(reports.flatMap((r) => r.result?.labMeasurements?.map((l) => l.test) || []))
    );
  }, [reports]);

  // Compute trend data for selected lab test
  const trendData = useMemo(() => {
    if (!selectedLabTest) return [];
    return reports
      .map((r) => {
        const item = r.result?.labMeasurements?.find(
          (l) => l.test.toLowerCase() === selectedLabTest.toLowerCase()
        );
        if (!item) return null;
        const numVal = parseFloat(String(item.value).replace(/[^0-9.]/g, ''));
        return {
          date: new Date(r.date).toLocaleDateString(),
          timestamp: r.date,
          value: isNaN(numVal) ? null : numVal,
          raw: item.value,
          unit: item.unit,
          status: item.status
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.timestamp - b!.timestamp);
  }, [selectedLabTest, reports]);

  // Multi-selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map((r) => r.id));
    }
  };

  // Batch Export Handler
  const handleBatchExport = async () => {
    const targetReports = selectedReportIds.length > 0
      ? reports.filter((r) => selectedReportIds.includes(r.id))
      : filteredReports;

    if (targetReports.length === 0) {
      showToast('Please select at least one report to export.');
      return;
    }

    setIsExportingBatch(true);
    try {
      const fileName = PDFExportService.exportBatchReports(targetReports, { location });
      showToast(`Batch PDF exported: ${fileName || 'Medical Portfolio'}`);
    } catch (err) {
      console.error('Batch export failed:', err);
      showToast('Failed to generate batch PDF. Please try again.');
    } finally {
      setIsExportingBatch(false);
    }
  };

  // Generate Quick High-Level Summary for a single entry
  const handleGenerateQuickSummary = async (report: StoredReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGeneratingSummaryId(report.id);

    try {
      const summaryText = await GeminiService.generateQuickSummary(
        report.fileName,
        report.result?.summary || '',
        report.result?.redFlags || [],
        report.result?.labMeasurements || [],
        report.result?.language || 'English'
      );

      setLocalSummaries((prev) => ({ ...prev, [report.id]: summaryText }));

      const updatedReport: StoredReport = {
        ...report,
        quickSummary: summaryText
      };

      if (onUpdateReport) {
        onUpdateReport(updatedReport);
      } else {
        // Direct local storage persistence fallback
        const existing = JSON.parse(localStorage.getItem('medimind_reports') || '[]');
        const updated = existing.map((r: StoredReport) => (r.id === report.id ? updatedReport : r));
        localStorage.setItem('medimind_reports', JSON.stringify(updated));
      }

      showToast(`Generated executive scan summary for ${report.fileName}`);
    } catch (err) {
      console.error('Failed to generate quick summary:', err);
      showToast('Could not generate AI summary. Using standard summary.');
    } finally {
      setGeneratingSummaryId(null);
    }
  };

  // Generate Quick High-Level Summaries for all entries in view
  const handleGenerateAllSummaries = async () => {
    setIsGeneratingAll(true);
    showToast(`Generating quick summaries for ${filteredReports.length} reports...`);
    try {
      for (const report of filteredReports) {
        if (!report.quickSummary && !localSummaries[report.id]) {
          await handleGenerateQuickSummary(report);
        }
      }
      showToast('All quick scan summaries updated!');
    } catch (err) {
      console.error('Batch summary generation error:', err);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Native Device Sharing Handler
  const handleShareReport = async (report: StoredReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const dateStr = new Date(report.date).toLocaleDateString();
    const flags = report.result?.redFlags || [];
    const redFlagSummary = flags.length > 0
      ? `Red Flags Detected (${flags.length}):\n` +
        flags.map((f) => `• [${f.severity}] ${f.finding}: ${f.action}`).join('\n')
      : 'Status: No red flags detected (All Clear).';

    const labsSummary = report.result?.labMeasurements?.length
      ? '\n\nKey Biomarkers:\n' +
        report.result.labMeasurements
          .slice(0, 5)
          .map((l) => `• ${l.test}: ${l.value} ${l.unit} (${l.status})`)
          .join('\n')
      : '';

    const shareContent = {
      title: `MediMind AI Report: ${report.fileName || 'Medical Summary'}`,
      text:
        `MediMind AI Medical Report Summary (${dateStr})\n` +
        `File: ${report.fileName}\n\n` +
        `Executive Scan Summary:\n${report.quickSummary || localSummaries[report.id] || report.result?.summary}\n\n` +
        `${redFlagSummary}${labsSummary}\n\n` +
        `Analyzed with MediMind AI (https://ais-pre-6rh4nekzcra4fep44o6zwe-390785525581.asia-east1.run.app)`
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareContent)) {
      try {
        await navigator.share(shareContent);
        showToast('Shared successfully via device!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // User canceled share sheet
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareContent.text);
      showToast('Report summary copied to clipboard!');
    } catch (err) {
      showToast('Failed to share or copy text.');
    }
  };

  // Formatted scan summary text for an item
  const getQuickSummaryText = (report: StoredReport): string => {
    if (report.quickSummary) return report.quickSummary;
    if (localSummaries[report.id]) return localSummaries[report.id];

    // Smart on-the-fly synthesis
    const { count, hasHigh } = getRedFlagStatus(report);
    const labAbnormal = report.result?.labMeasurements?.filter((l) => l.status !== 'normal') || [];

    const flagStr = count > 0
      ? `${count} red flag observation${count > 1 ? 's' : ''} noted${hasHigh ? ' (including critical findings)' : ''}.`
      : 'All primary parameters clear of emergent red flags.';

    const labStr = labAbnormal.length > 0
      ? `Notable variance in ${labAbnormal.slice(0, 2).map((l) => l.test).join(', ')}.`
      : '';

    const summaryBase = report.result?.summary
      ? report.result.summary.split('. ').slice(0, 2).join('. ') + '.'
      : '';

    return `${summaryBase} ${flagStr} ${labStr}`.trim();
  };

  const hasActiveFilters = searchTerm !== '' || dateFilter !== 'all' || redFlagFilter !== 'all' || selectedLabTest !== null;

  return (
    <div className={`h-full flex flex-col max-w-5xl mx-auto ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 animate-fade-in">
          <div className="bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-medium flex items-center gap-2">
            <i className="fas fa-check-circle text-emerald-400 text-sm"></i>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Saved Medical Reports & Trends</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reports.length} report{reports.length === 1 ? '' : 's'} archived locally • Filter, compare biomarkers & export
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {reports.length > 0 && (
            <>
              {/* Batch Export Button */}
              <button
                onClick={handleBatchExport}
                disabled={isExportingBatch}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Aggregate selected reports into a single consolidated PDF portfolio"
              >
                <i className={`fas ${isExportingBatch ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                <span>
                  {selectedReportIds.length > 0
                    ? `Export Selected (${selectedReportIds.length}) to PDF`
                    : 'Batch Export to PDF'}
                </span>
              </button>

              {/* Clear All */}
              <button
                onClick={() => {
                  if (confirm('Permanently delete all stored medical reports? This action cannot be undone.')) {
                    onClearAll();
                    setSelectedReportIds([]);
                  }
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 transition-colors"
                title="Clear all stored reports"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </>
          )}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border text-center ${
          darkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-3">
            <i className="fas fa-file-medical"></i>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Saved Reports Yet</h3>
          <p className="text-xs max-w-md mb-4 leading-relaxed">
            Upload and analyze lab documents, pathology tests, or medical letters on the Dashboard. Saved entries will appear here with instant red-flag detection, scannable summaries, and multi-report PDF export.
          </p>
          <Button onClick={onBack} className="text-xs">
            Return to Dashboard
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pb-12 pr-1">
          {/* Search & Comprehensive Filter Bar */}
          <div className={`p-3.5 rounded-2xl border space-y-3 ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {/* Primary Search Input */}
            <div className="flex items-center gap-2">
              <div className={`flex-1 flex items-center px-3 py-2 rounded-xl border ${
                darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <i className="fas fa-search text-slate-400 mr-2 text-xs"></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find reports by file name, keyword, or date (e.g., 'Blood', 'Sep 21', 'Glucose')..."
                  className="w-full bg-transparent text-xs focus:outline-none placeholder-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Clear search"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {/* Quick Summary Batch Trigger */}
              <button
                onClick={handleGenerateAllSummaries}
                disabled={isGeneratingAll || filteredReports.length === 0}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  darkMode
                    ? 'border-slate-700 bg-slate-900 text-blue-400 hover:bg-slate-800'
                    : 'border-slate-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                } disabled:opacity-50`}
                title="Generate high-level scan summaries for all visible entries"
              >
                <i className={`fas ${isGeneratingAll ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                <span className="hidden sm:inline">Scan Summaries</span>
              </button>
            </div>

            {/* Filter Controls Row: Date, Red Flags, Lab Marker */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Date Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">📅 Filter Date: All Time</option>
                  <option value="today">📅 Today</option>
                  <option value="7days">📅 Past 7 Days</option>
                  <option value="30days">📅 Past 30 Days</option>
                  <option value="90days">📅 Past 90 Days</option>
                  <option value="custom">📅 Pick Specific Date...</option>
                </select>

                {dateFilter === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className={`px-2 py-1 rounded-xl border text-xs ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                )}
              </div>

              {/* Red Flag Visual Filter Dropdown */}
              <div>
                <select
                  value={redFlagFilter}
                  onChange={(e) => setRedFlagFilter(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                    redFlagFilter === 'red_flags' || redFlagFilter === 'high_only'
                      ? 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 bg-red-50/50 dark:bg-red-950/40'
                      : redFlagFilter === 'clear_only'
                      ? 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40'
                      : darkMode
                      ? 'bg-slate-900 border-slate-700 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">🔍 Red Flags: All Reports</option>
                  <option value="red_flags">🚨 Red Flags Only (High/Med)</option>
                  <option value="high_only">⚠️ Critical / High Urgency Only</option>
                  <option value="clear_only">✅ All Clear (No Red Flags)</option>
                </select>
              </div>

              {/* Lab Marker Filter for Trend Comparison */}
              <div>
                <select
                  value={selectedLabTest || ''}
                  onChange={(e) => setSelectedLabTest(e.target.value || null)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">📈 Biomarker Trend: None Selected</option>
                  {allLabTests.map((t) => (
                    <option key={t} value={t}>
                      📈 Track: {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Stats & Reset Bar */}
            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-100">{filteredReports.length}</strong> of{' '}
                  {reports.length} report{reports.length === 1 ? '' : 's'}
                </span>
                {selectedReportIds.length > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    • {selectedReportIds.length} selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="hover:underline font-medium text-slate-600 dark:text-slate-300"
                >
                  {selectedReportIds.length === filteredReports.length && filteredReports.length > 0
                    ? 'Deselect All'
                    : 'Select All in View'}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDateFilter('all');
                      setCustomDate('');
                      setRedFlagFilter('all');
                      setSelectedLabTest(null);
                    }}
                    className="text-red-500 hover:underline font-semibold ml-2"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Selected Biomarker Trend Chart Card */}
          {selectedLabTest && trendData.length > 0 && (
            <div className={`p-4 rounded-2xl border animate-fade-in ${
              darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Biomarker Chronological Trend: {selectedLabTest}</h4>
                    <p className="text-[10px] text-slate-400">Tracking {trendData.length} records across your uploaded reports</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLabTest(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <i className="fas fa-times mr-1"></i> Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {trendData.map((d, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl text-center border ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <p className="text-[10px] text-slate-400">{d?.date}</p>
                    <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {d?.raw} <span className="text-[10px] font-normal text-slate-500">{d?.unit}</span>
                    </p>
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase mt-1 ${
                      d?.status === 'critical'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : d?.status === 'attention'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {d?.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch Floating Action Bar when Items are Selected */}
          {selectedReportIds.length > 0 && (
            <div className="sticky top-2 z-30 animate-fade-in">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white text-blue-700 text-xs font-bold flex items-center justify-center">
                    {selectedReportIds.length}
                  </span>
                  <span className="text-xs font-semibold">
                    report{selectedReportIds.length > 1 ? 's' : ''} selected for aggregation
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchExport}
                    disabled={isExportingBatch}
                    className="px-3.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <i className={`fas ${isExportingBatch ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                    <span>Export Consolidated PDF</span>
                  </button>
                  <button
                    onClick={() => setSelectedReportIds([])}
                    className="p-1.5 text-blue-200 hover:text-white text-xs"
                    title="Clear selection"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reports List */}
          {filteredReports.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              darkMode ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <i className="fas fa-filter text-2xl text-slate-400 mb-2"></i>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No reports match your active filters</p>
              <p className="text-xs mt-1">Try clearing your search term or adjusting the date/red flag criteria.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('all');
                  setCustomDate('');
                  setRedFlagFilter('all');
                  setSelectedLabTest(null);
                }}
                className="mt-3 text-xs text-blue-500 font-bold underline hover:text-blue-600"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const { flags, hasHigh, hasMed, hasAny, count } = getRedFlagStatus(report);
                const isSelected = selectedReportIds.includes(report.id);
                const quickSummary = getQuickSummaryText(report);
                const isGeneratingThisSummary = generatingSummaryId === report.id;

                // Visual Indicator Borders & Backgrounds
                let indicatorBorderClass = 'border-l-[6px] border-l-emerald-500';
                let indicatorBgClass = darkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200';
                if (hasHigh) {
                  indicatorBorderClass = 'border-l-[6px] border-l-red-500';
                  indicatorBgClass = darkMode
                    ? 'bg-red-950/20 border-red-900/50'
                    : 'bg-red-50/30 border-red-200';
                } else if (hasMed) {
                  indicatorBorderClass = 'border-l-[6px] border-l-amber-500';
                  indicatorBgClass = darkMode
                    ? 'bg-amber-950/20 border-amber-900/50'
                    : 'bg-amber-50/30 border-amber-200';
                }

                return (
                  <div
                    key={report.id}
                    className={`p-4 rounded-2xl border transition-all relative ${indicatorBorderClass} ${indicatorBgClass} ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    } hover:shadow-md`}
                  >
                    {/* Header Row: Checkbox, Name, Visual Status Badge, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-start sm:items-center gap-3">
                        {/* Multi-select checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(report.id)}
                          className="mt-1 sm:mt-0 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          title="Select for batch export"
                        />

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              onClick={() => setDetailReport(report)}
                              className="text-sm font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-900 dark:text-slate-100"
                            >
                              {report.fileName || 'Medical Analysis'}
                            </h4>

                            {/* Prominent Visual Indicator Badge */}
                            {hasHigh ? (
                              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 shadow-sm">
                                <i className="fas fa-exclamation-triangle text-red-600 animate-pulse text-[10px]"></i>
                                Red Flag (High Alert)
                              </span>
                            ) : hasMed ? (
                              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-sm">
                                <i className="fas fa-exclamation-circle text-amber-600 text-[10px]"></i>
                                Attention ({count} Finding{count > 1 ? 's' : ''})
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-sm">
                                <i className="fas fa-check-circle text-emerald-600 text-[10px]"></i>
                                All Clear
                              </span>
                            )}
                          </div>

                          {/* Date and Time */}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <i className="far fa-calendar-alt mr-1"></i>
                            {new Date(report.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}{' '}
                            • {new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {/* View Details Button */}
                        <button
                          onClick={() => setDetailReport(report)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition-colors flex items-center gap-1"
                          title="Open report detail view"
                        >
                          <i className="fas fa-eye"></i>
                          <span>View</span>
                        </button>

                        {/* Dedicated Share Button on list item */}
                        <button
                          onClick={(e) => handleShareReport(report, e)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          title="Share via device native sheet or clipboard"
                        >
                          <i className="fas fa-share-alt"></i>
                          <span>Share</span>
                        </button>

                        {/* Individual PDF Export Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            PDFExportService.exportAnalysisReport(report.result, {
                              fileName: report.fileName,
                              reportDate: report.date,
                              location
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 hover:bg-red-100 transition-colors flex items-center gap-1"
                          title="Download individual PDF report"
                        >
                          <i className="fas fa-file-pdf"></i>
                          <span>PDF</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete report "${report.fileName}"?`)) {
                              onDeleteReport(report.id);
                              setSelectedReportIds((prev) => prev.filter((id) => id !== report.id));
                            }
                          }}
                          className="p-1.5 text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Delete report"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    {/* Red Flag Callouts (Visual indicator of urgent findings right on card) */}
                    {hasAny && (
                      <div className="mb-2.5 space-y-1">
                        {flags.slice(0, 2).map((rf, fIdx) => (
                          <div
                            key={fIdx}
                            className={`px-2.5 py-1 rounded-lg text-xs flex items-center justify-between gap-2 ${
                              rf.severity === 'HIGH'
                                ? 'bg-red-100/70 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/60'
                                : 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60'
                            }`}
                          >
                            <span className="font-semibold truncate">
                              <i className={`fas ${rf.severity === 'HIGH' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'} mr-1.5 text-[10px]`}></i>
                              {rf.finding}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0">
                              {rf.severity}
                            </span>
                          </div>
                        ))}
                        {flags.length > 2 && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold pl-1">
                            +{flags.length - 2} more red flag finding{flags.length - 2 > 1 ? 's' : ''} (click View for details)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Quick High-Level Summary Paragraph Container */}
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      darkMode ? 'bg-slate-900/70 border-slate-700/80 text-slate-300' : 'bg-slate-50/80 border-slate-200 text-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <i className="fas fa-file-waveform text-blue-500"></i>
                          <span>Quick Scan Summary</span>
                        </div>

                        <button
                          onClick={(e) => handleGenerateQuickSummary(report, e)}
                          disabled={isGeneratingThisSummary}
                          className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                          title="Generate or regenerate an AI-condensed scan paragraph"
                        >
                          <i className={`fas ${isGeneratingThisSummary ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                          <span>{report.quickSummary || localSummaries[report.id] ? 'Refresh Summary' : 'Generate AI Scan'}</span>
                        </button>
                      </div>

                      <p className="line-clamp-3">
                        {quickSummary}
                      </p>
                    </div>

                    {/* Structured Lab Tags */}
                    {report.result?.labMeasurements && report.result.labMeasurements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-1">
                        {report.result.labMeasurements.slice(0, 5).map((lab, i) => (
                          <span
                            key={i}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              lab.status === 'critical'
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                : lab.status === 'attention'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {lab.test}: {lab.value} {lab.unit}
                          </span>
                        ))}
                        {report.result.labMeasurements.length > 5 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full text-slate-400">
                            +{report.result.labMeasurements.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dedicated Saved Report Detail View Modal with Native Share */}
      {detailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
              highContrast
                ? 'bg-black text-yellow-300 border-yellow-400'
                : darkMode
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-white text-slate-800 border-slate-200'
            }`}
          >
            {/* Modal Top Header */}
            <div className={`p-4 border-b flex items-center justify-between gap-3 shrink-0 ${
              darkMode ? 'border-slate-800 bg-slate-850' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg">
                  <i className="fas fa-file-medical-alt"></i>
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight leading-snug">
                    {detailReport.fileName || 'Medical Analysis Report'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Archived: {new Date(detailReport.date).toLocaleDateString()} at{' '}
                    {new Date(detailReport.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailReport(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Close dialog"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
              {/* Red Flag Banner */}
              {detailReport.result?.redFlags && detailReport.result.redFlags.length > 0 ? (
                <div className="p-4 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                    <span>Red Flags Detected ({detailReport.result.redFlags.length})</span>
                  </div>
                  <div className="space-y-2">
                    {detailReport.result.redFlags.map((flag, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-red-200 dark:border-red-900/40">
                        <div className="flex justify-between items-start font-bold">
                          <span>{flag.finding}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white uppercase">{flag.severity}</span>
                        </div>
                        <p className="text-xs mt-1 text-red-700 dark:text-red-300">Action: {flag.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
                  <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
                  <div>
                    <h4 className="font-bold text-xs">All Clear — No Red Flags Detected</h4>
                    <p className="text-[11px] opacity-80">This report has no urgent critical indicators detected by clinical triage.</p>
                  </div>
                </div>
              )}

              {/* Quick Scan Summary Box */}
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-50/50 border-blue-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <i className="fas fa-file-waveform"></i>
                    <span>Quick High-Level Executive Summary</span>
                  </h4>
                  <button
                    onClick={() => handleGenerateQuickSummary(detailReport)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <i className="fas fa-wand-magic-sparkles"></i>
                    <span>Refresh Summary</span>
                  </button>
                </div>
                <p className="leading-relaxed text-slate-700 dark:text-slate-200">
                  {getQuickSummaryText(detailReport)}
                </p>
              </div>

              {/* Plain-Language Clinical Explanation */}
              {detailReport.result?.simpleExplanation && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Patient-Friendly Explanation
                  </h4>
                  <div className={`p-4 rounded-xl border leading-relaxed ${
                    darkMode ? 'bg-slate-800/40 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {detailReport.result.simpleExplanation}
                  </div>
                </div>
              )}

              {/* Structured Lab Biomarkers */}
              {detailReport.result?.labMeasurements && detailReport.result.labMeasurements.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Laboratory Measurements ({detailReport.result.labMeasurements.length})
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}>
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Test / Biomarker</th>
                          <th className="py-2.5 px-3 font-semibold">Result</th>
                          <th className="py-2.5 px-3 font-semibold">Reference Range</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {detailReport.result.labMeasurements.map((lab, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2 px-3 font-medium">{lab.test}</td>
                            <td className="py-2 px-3 font-bold text-blue-600 dark:text-blue-400">
                              {lab.value} {lab.unit}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {lab.referenceRangeText || (lab.referenceRangeMin !== undefined ? `${lab.referenceRangeMin} - ${lab.referenceRangeMax}` : 'Standard')}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded uppercase ${
                                lab.status === 'critical'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                  : lab.status === 'attention'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}>
                                {lab.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommended Next Steps */}
              {detailReport.result?.nextSteps && detailReport.result.nextSteps.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Actionable Next Steps
                  </h4>
                  <ul className="space-y-1.5 list-disc pl-5 text-slate-700 dark:text-slate-300">
                    {detailReport.result.nextSteps.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Footer with Dedicated Share Button */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
              darkMode ? 'border-slate-800 bg-slate-850' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                {/* DEDICATED SHARE BUTTON */}
                <button
                  onClick={() => handleShareReport(detailReport)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                  title="Share report summary via your device's native sharing sheet"
                >
                  <i className="fas fa-share-alt"></i>
                  <span>Share Report History</span>
                </button>

                {/* PDF Export Button */}
                <button
                  onClick={() => {
                    PDFExportService.exportAnalysisReport(detailReport.result, {
                      fileName: detailReport.fileName,
                      reportDate: detailReport.date,
                      location
                    });
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  title="Download single PDF"
                >
                  <i className="fas fa-file-pdf"></i>
                  <span>Download PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Open in Full Analysis View */}
                <button
                  onClick={() => {
                    const r = detailReport;
                    setDetailReport(null);
                    onSelectReport(r);
                  }}
                  className="px-3.5 py-2 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors"
                >
                  Full Analysis View →
                </button>

                <button
                  onClick={() => setDetailReport(null)}
                  className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
