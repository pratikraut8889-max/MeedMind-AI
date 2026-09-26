import React, { useState, useEffect, useRef } from 'react';

interface DashboardQuickActionsProps {
  onUploadReport: () => void;
  onAskAssistant: () => void;
  onWellnessCheckin: () => void;
  darkMode?: boolean;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  onUploadReport,
  onAskAssistant,
  onWellnessCheckin,
  darkMode = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      id="dashboard-quick-actions"
      className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5 select-none"
    >
      {/* Expanded Action Items */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 animate-fade-in">
          {/* Action 1: Upload New Report */}
          <button
            type="button"
            id="quick-action-upload"
            onClick={() => {
              setIsOpen(false);
              onUploadReport();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-2xl transition-all group active:scale-95"
            aria-label="Upload New Report"
          >
            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
              Upload New Report
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform shrink-0">
              <i className="fas fa-file-arrow-up"></i>
            </div>
          </button>

          {/* Action 2: Ask AI Assistant */}
          <button
            type="button"
            id="quick-action-assistant"
            onClick={() => {
              setIsOpen(false);
              onAskAssistant();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-2xl transition-all group active:scale-95"
            aria-label="Ask AI Assistant"
          >
            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
              Ask AI Assistant
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform shrink-0">
              <i className="fas fa-comment-medical"></i>
            </div>
          </button>

          {/* Action 3: Daily Wellness Check-in */}
          <button
            type="button"
            id="quick-action-wellness"
            onClick={() => {
              setIsOpen(false);
              onWellnessCheckin();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xl hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-2xl transition-all group active:scale-95"
            aria-label="Daily Wellness Check-in"
          >
            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
              Daily Wellness Check-in
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform shrink-0">
              <i className="fas fa-heart-pulse"></i>
            </div>
          </button>
        </div>
      )}

      {/* Main Trigger Floating Action Button */}
      <button
        type="button"
        id="quick-actions-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={isOpen ? 'Close Quick Actions' : 'Open Quick Actions'}
        className={`flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl transition-all duration-300 active:scale-95 ${
          isOpen
            ? 'bg-slate-800 text-white rotate-90 ring-4 ring-slate-400/20'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 ring-4 ring-blue-500/10 hover:shadow-blue-500/40'
        }`}
      >
        <i className={`fas ${isOpen ? 'fa-xmark text-lg' : 'fa-bolt text-base sm:text-lg'} transition-transform`}></i>
        {!isOpen && (
          <span className="text-xs sm:text-sm font-bold tracking-wide hidden xs:inline">
            Quick Actions
          </span>
        )}
      </button>
    </div>
  );
};
