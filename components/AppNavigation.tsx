import React, { useState } from 'react';
import { AppMode, SUPPORTED_LANGUAGES } from '../types';
import { Badge } from './SharedComponents';

interface AppNavigationProps {
  currentMode: AppMode;
  onNavigate: (mode: AppMode) => void;
  onOpenSettings: () => void;
  savedReportsCount: number;
  activeMedsCount: number;
  darkMode: boolean;
  highContrast: boolean;
  language: string;
  onLanguageChange: (lang: string) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({
  currentMode,
  onNavigate,
  onOpenSettings,
  savedReportsCount,
  activeMedsCount,
  darkMode,
  highContrast,
  language,
  onLanguageChange,
  userEmail,
  onSignOut,
  onSignIn
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      mode: AppMode.DASHBOARD,
      label: 'Dashboard',
      icon: 'fas fa-chart-pie',
      description: 'Overview & vitals glance'
    },
    {
      mode: AppMode.AI_CHAT,
      label: 'AI Health Assistant',
      icon: 'fas fa-comment-medical',
      description: 'Grounded medical guidance',
      badge: 'RAG'
    },
    {
      mode: AppMode.ANALYSIS,
      label: 'Medical Report Analysis',
      icon: 'fas fa-file-medical',
      description: 'Lab interpretation & biomarkers'
    },
    {
      mode: AppMode.VISUAL_SYMPTOM_CHECK,
      label: 'Symptom Analysis',
      icon: 'fas fa-camera-retro',
      description: 'Optical dermatology triage'
    },
    {
      mode: AppMode.MY_MEDS,
      label: 'Medication Information',
      icon: 'fas fa-pills',
      description: 'Schedules & safety alarms',
      count: activeMedsCount
    },
    {
      mode: AppMode.EMERGENCY,
      label: 'Emergency Mode',
      icon: 'fas fa-truck-medical',
      description: 'Rapid 911 dispatch & triage',
      isEmergency: true
    },
    {
      mode: AppMode.HEALTH_HISTORY,
      label: 'History & Vitals',
      icon: 'fas fa-heart-pulse',
      description: 'Blood pressure, glucose trends'
    },
    {
      mode: AppMode.SAVED_REPORTS,
      label: 'Saved Reports',
      icon: 'fas fa-folder-open',
      description: 'Clinical archives & PDF export',
      count: savedReportsCount
    }
  ];

  const handleNavClick = (mode: AppMode) => {
    onNavigate(mode);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ================= DESKTOP / TABLET SIDEBAR ================= */}
      <aside
        className={`hidden lg:flex flex-col w-72 shrink-0 border-r min-h-screen transition-colors ${
          highContrast
            ? 'bg-slate-950 border-yellow-400 text-yellow-300'
            : darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : 'bg-white border-slate-200/90 text-slate-700'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div
            onClick={() => onNavigate(AppMode.DASHBOARD)}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm shadow-blue-500/30">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  MediMind<span className="text-blue-600">.ai</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Clinical Decision Support</p>
            </div>
          </div>
        </div>

        {/* Primary Navigation List */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Clinical Workspace
          </div>

          {navItems.map((item) => {
            const isActive = currentMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => handleNavClick(item.mode)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all group ${
                  item.isEmergency
                    ? isActive
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : darkMode
                    ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.isEmergency
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                        : darkMode
                        ? 'bg-slate-800 text-slate-400 group-hover:text-blue-400'
                        : 'bg-slate-100 text-slate-500 group-hover:text-blue-600'
                    }`}
                  >
                    <i className={`${item.icon} text-sm`}></i>
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 ml-2">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white text-blue-600'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility & Patient Info */}
        <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-xs font-semibold transition-colors ${
              darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <i className="fas fa-gear text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-bold">Preferences & Display</span>
              <span className="block text-[10px] text-slate-400">Language, high contrast, fonts</span>
            </div>
          </button>

          {/* Privacy Link */}
          <button
            onClick={() => onNavigate(AppMode.PRIVACY_POLICY)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
              currentMode === AppMode.PRIVACY_POLICY
                ? 'text-blue-600 font-bold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <i className="fas fa-shield-check text-xs"></i>
            <span>HIPAA & Security Compliance</span>
          </button>

          {/* Patient Account Pill */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs px-1">
            <div className="min-w-0 pr-2">
              <span className="block font-bold text-slate-800 dark:text-slate-200 truncate">
                {userEmail || 'Patient Session'}
              </span>
              <span className="block text-[10px] text-slate-400">
                {userEmail ? 'Cloud Synced' : 'Local Encryption'}
              </span>
            </div>
            {userEmail ? (
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                title="Sign out"
              >
                <i className="fas fa-arrow-right-from-bracket text-xs"></i>
              </button>
            ) : onSignIn ? (
              <button
                onClick={onSignIn}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Sign In
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      {/* ================= MOBILE / TABLET TOP HEADER ================= */}
      <header
        className={`lg:hidden sticky top-0 z-40 border-b flex items-center justify-between px-4 py-3 transition-colors ${
          highContrast
            ? 'bg-slate-950 border-yellow-400 text-yellow-300'
            : darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          onClick={() => onNavigate(AppMode.DASHBOARD)}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <i className="fas fa-heart-pulse"></i>
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
            MediMind<span className="text-blue-600">.ai</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Emergency Button on Mobile Header */}
          <button
            onClick={() => onNavigate(AppMode.EMERGENCY)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
          >
            <i className="fas fa-phone text-[10px]"></i>
            <span>911</span>
          </button>

          {/* Settings / Menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle navigation menu"
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-sm`}></i>
          </button>
        </div>
      </header>

      {/* ================= MOBILE EXPANDED MENU DRAWER ================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
          <div
            className={`w-full max-h-[85vh] rounded-t-3xl p-5 overflow-y-auto space-y-4 border-t ${
              darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Navigation Menu</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.mode}
                  onClick={() => handleNavClick(item.mode)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-semibold ${
                    currentMode === item.mode
                      ? 'bg-blue-600 text-white'
                      : item.isEmergency
                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                      : darkMode
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className={`${item.icon} text-base w-6 text-center`}></i>
                    <div>
                      <span className="block font-bold">{item.label}</span>
                      <span className="block text-[11px] opacity-75">{item.description}</span>
                    </div>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSettings();
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2"
              >
                <i className="fas fa-gear"></i> Settings
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate(AppMode.PRIVACY_POLICY);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 text-slate-500"
              >
                <i className="fas fa-shield"></i> Privacy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MOBILE BOTTOM TAB BAR ================= */}
      <nav
        aria-label="Mobile Navigation"
        className={`lg:hidden fixed bottom-0 inset-x-0 z-40 border-t flex items-center justify-around px-2 py-1.5 backdrop-blur-lg shadow-2xl transition-colors ${
          highContrast
            ? 'bg-slate-950 border-yellow-400 text-yellow-300'
            : darkMode
            ? 'bg-slate-900/95 border-slate-800 text-slate-300'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Tab 1: Overview (Dashboard) */}
        <button
          type="button"
          onClick={() => onNavigate(AppMode.DASHBOARD)}
          className={`flex-1 min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all active:scale-95 ${
            currentMode === AppMode.DASHBOARD
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="Overview Dashboard"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors ${
            currentMode === AppMode.DASHBOARD ? 'bg-blue-50 dark:bg-blue-950/60' : ''
          }`}>
            <i className="fas fa-chart-pie"></i>
          </div>
          <span className="text-[10px] leading-none tracking-tight">Overview</span>
        </button>

        {/* Tab 2: Assistant (AI Health Chat) */}
        <button
          type="button"
          onClick={() => onNavigate(AppMode.AI_CHAT)}
          className={`flex-1 min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all active:scale-95 ${
            currentMode === AppMode.AI_CHAT
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="AI Health Assistant"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors ${
            currentMode === AppMode.AI_CHAT ? 'bg-blue-50 dark:bg-blue-950/60' : ''
          }`}>
            <i className="fas fa-comment-medical"></i>
          </div>
          <span className="text-[10px] leading-none tracking-tight">Assistant</span>
        </button>

        {/* Tab 3: Analyze (Upload / Scan) - Elevated Floating Button */}
        <button
          type="button"
          onClick={() => onNavigate(AppMode.ANALYSIS)}
          className="flex-1 min-w-[48px] min-h-[48px] flex flex-col items-center justify-center -mt-4 transition-transform active:scale-95"
          aria-label="Analyze Document"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-base shadow-lg shadow-blue-500/30 ring-4 ring-white dark:ring-slate-900">
            <i className="fas fa-plus"></i>
          </div>
          <span className={`text-[10px] font-bold mt-1 leading-none tracking-tight ${
            currentMode === AppMode.ANALYSIS ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
          }`}>
            Analyze
          </span>
        </button>

        {/* Tab 4: Meds (Prescriptions & Reminders) */}
        <button
          type="button"
          onClick={() => onNavigate(AppMode.MY_MEDS)}
          className={`flex-1 min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl relative transition-all active:scale-95 ${
            currentMode === AppMode.MY_MEDS
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="Medication Reminders"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm relative transition-colors ${
            currentMode === AppMode.MY_MEDS ? 'bg-blue-50 dark:bg-blue-950/60' : ''
          }`}>
            <i className="fas fa-pills"></i>
            {activeMedsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {activeMedsCount > 9 ? '9+' : activeMedsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-none tracking-tight">Meds</span>
        </button>

        {/* Tab 5: More (Drawer with Emergency, Reports, Vitals, Settings) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex-1 min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          aria-label="Open More Menu"
          aria-expanded={mobileMenuOpen}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
            <i className="fas fa-bars"></i>
          </div>
          <span className="text-[10px] leading-none tracking-tight">More</span>
        </button>
      </nav>
    </>
  );
};
