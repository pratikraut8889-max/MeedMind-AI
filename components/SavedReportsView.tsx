import React, { useState } from 'react';
import { StoredReport, LabMeasurement } from '../types';
import { PDFExportService } from '../services/pdfExportService';
import { Card, Button } from './SharedComponents';

interface SavedReportsViewProps {
  reports: StoredReport[];
  onSelectReport: (report: StoredReport) => void;
  onDeleteReport: (id: string) => void;
  onClearAll: () => void;
  onBack: () => void;
  darkMode: boolean;
  highContrast: boolean;
}

export const SavedReportsView: React.FC<SavedReportsViewProps> = ({
  reports,
  onSelectReport,
  onDeleteReport,
  onClearAll,
  onBack,
  darkMode,
  highContrast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabTest, setSelectedLabTest] = useState<string | null>(null);

  const filteredReports = reports.filter((r) => {
    const query = searchTerm.toLowerCase();
    const nameMatch = (r.fileName || '').toLowerCase().includes(query);
    const summaryMatch = (r.result?.summary || '').toLowerCase().includes(query);
    const labMatch = r.result?.labMeasurements?.some((l) => l.test.toLowerCase().includes(query));
    return nameMatch || summaryMatch || labMatch;
  });

  // Extract all unique lab tests that appear across reports
  const allLabTests = Array.from(
    new Set(
      reports.flatMap((r) => r.result?.labMeasurements?.map((l) => l.test) || [])
    )
  );

  // Compute trend data for selected lab test
  const trendData = selectedLabTest
    ? reports
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
        .sort((a, b) => a!.timestamp - b!.timestamp)
    : [];

  return (
    <div className={`h-full flex flex-col max-w-5xl mx-auto ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
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
            <h2 className="text-xl font-bold">Saved Medical Reports & Trends</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reports.length} report{reports.length === 1 ? '' : 's'} stored securely on your local device
            </p>
          </div>
        </div>

        {reports.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Permanently delete all stored medical reports? This cannot be undone.')) {
                onClearAll();
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900 transition-colors"
          >
            <i className="fas fa-trash-alt mr-1"></i> Clear All Reports
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border text-center ${
          darkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-3">
            <i className="fas fa-file-medical"></i>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Saved Reports Yet</h3>
          <p className="text-xs max-w-md mb-4">
            Upload and analyze lab documents or medical summaries. You can choose to save them for long-term tracking and biomarker trends.
          </p>
          <Button onClick={onBack} className="text-xs">
            Return to Dashboard
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pb-8">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className={`flex-1 flex items-center px-3 py-2 rounded-xl border ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <i className="fas fa-search text-slate-400 mr-2 text-xs"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reports by name, summary, or lab marker (e.g. Glucose)..."
                className="w-full bg-transparent text-xs focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-xs text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            {/* Lab Marker Filter for Trend Comparison */}
            {allLabTests.length > 0 && (
              <select
                value={selectedLabTest || ''}
                onChange={(e) => setSelectedLabTest(e.target.value || null)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="">Compare Lab Biomarker Trend...</option>
                {allLabTests.map((t) => (
                  <option key={t} value={t}>
                    Trend: {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Biomarker Trend Chart Card if selected */}
          {selectedLabTest && trendData.length > 0 && (
            <div className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <i className="fas fa-chart-line text-blue-500"></i>
                  <h4 className="text-sm font-bold">Biomarker Trend: {selectedLabTest}</h4>
                </div>
                <button
                  onClick={() => setSelectedLabTest(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close Trend
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
                        ? 'bg-red-100 text-red-700'
                        : d?.status === 'attention'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {d?.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Grid */}
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className={`p-4 rounded-2xl border transition-all ${
                  darkMode ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm">
                      <i className="fas fa-file-alt"></i>
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {report.fileName || 'Medical Analysis'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(report.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => onSelectReport(report)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100"
                    >
                      <i className="fas fa-eye mr-1"></i> View
                    </button>
                    <button
                      onClick={() => {
                        PDFExportService.exportAnalysisReport(report.result, {
                          fileName: report.fileName,
                          reportDate: report.date
                        });
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 hover:bg-red-100"
                      title="Download PDF"
                    >
                      <i className="fas fa-file-pdf mr-1"></i> PDF
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete report "${report.fileName}"?`)) {
                          onDeleteReport(report.id);
                        }
                      }}
                      className="p-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete report"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                  {report.result?.summary}
                </p>

                {/* Structured Lab Tags if available */}
                {report.result?.labMeasurements && report.result.labMeasurements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
