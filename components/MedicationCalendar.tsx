import React, { useState, useMemo } from 'react';
import { Medication, MedicationIntakeLog, DayComplianceSummary, CareProfile } from '../types';
import { jsPDF } from 'jspdf';

interface MedicationCalendarProps {
  medications: Medication[];
  logs: MedicationIntakeLog[];
  onLogIntake: (log: Omit<MedicationIntakeLog, 'id' | 'timestamp'> & { id?: string }) => Promise<void>;
  onDeleteLog: (logId: string) => Promise<void>;
  onBack: () => void;
  onOpenMyMeds?: () => void;
  patientName?: string;
  careProfile?: CareProfile | null;
  darkMode: boolean;
  highContrast: boolean;
}

export const MedicationCalendar: React.FC<MedicationCalendarProps> = ({
  medications,
  logs,
  onLogIntake,
  onDeleteLog,
  onBack,
  onOpenMyMeds,
  patientName,
  careProfile,
  darkMode,
  highContrast
}) => {
  // Calendar View Navigation State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMedFilter, setSelectedMedFilter] = useState<string>('all');
  const [showLogModal, setShowLogModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeLogMed, setActiveLogMed] = useState<Medication | null>(null);
  const [logTimeInput, setLogTimeInput] = useState<string>('08:00');
  const [logStatusInput, setLogStatusInput] = useState<'taken' | 'missed' | 'skipped'>('taken');
  const [logNotesInput, setLogNotesInput] = useState<string>('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const displayPatientName = careProfile?.name || patientName || 'Patient';

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(todayStr);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Filtered medications
  const activeMedications = useMemo(() => {
    if (selectedMedFilter === 'all') return medications;
    return medications.filter((m) => m.id === selectedMedFilter);
  }, [medications, selectedMedFilter]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isFuture: boolean;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr
      });
    }

    // Next month padding to fill grid (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr
      });
    }

    return days;
  }, [year, month, todayStr]);

  // Map of logs by dateStr
  const logsByDate = useMemo(() => {
    const map = new Map<string, MedicationIntakeLog[]>();
    for (const log of logs) {
      if (selectedMedFilter !== 'all' && log.medicationId !== selectedMedFilter) {
        continue;
      }
      const existing = map.get(log.takenDate) || [];
      existing.push(log);
      map.set(log.takenDate, existing);
    }
    return map;
  }, [logs, selectedMedFilter]);

  // Calculate compliance for a specific date
  const getDayCompliance = (dateStr: string, isFuture: boolean): DayComplianceSummary => {
    const dayLogs = logsByDate.get(dateStr) || [];
    const scheduledMeds = activeMedications;
    const totalScheduled = scheduledMeds.length;

    if (totalScheduled === 0) {
      return {
        date: dateStr,
        totalScheduled: 0,
        totalTaken: dayLogs.filter((l) => l.status === 'taken').length,
        totalMissed: 0,
        totalSkipped: 0,
        complianceRate: 100,
        status: 'none',
        logs: dayLogs
      };
    }

    const totalTaken = dayLogs.filter((l) => l.status === 'taken').length;
    const totalMissed = dayLogs.filter((l) => l.status === 'missed').length;
    const totalSkipped = dayLogs.filter((l) => l.status === 'skipped').length;

    let status: 'full' | 'partial' | 'missed' | 'scheduled' | 'none';

    if (isFuture) {
      status = 'scheduled';
    } else if (totalTaken >= totalScheduled) {
      status = 'full';
    } else if (totalTaken > 0 || totalSkipped > 0) {
      status = 'partial';
    } else if (dateStr < todayStr) {
      status = 'missed';
    } else {
      // Today pending
      status = totalTaken > 0 ? 'partial' : 'scheduled';
    }

    const rate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;

    return {
      date: dateStr,
      totalScheduled,
      totalTaken,
      totalMissed,
      totalSkipped,
      complianceRate: Math.min(rate, 100),
      status,
      logs: dayLogs
    };
  };

  // Month Compliance Statistics
  const monthStats = useMemo(() => {
    let totalDosesScheduled = 0;
    let totalDosesTaken = 0;
    let totalDosesMissed = 0;
    let daysWithFullCompliance = 0;
    let pastDaysCount = 0;

    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInThisMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInThisMonth; day++) {
      const dateStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
      if (dateStr <= todayStr) {
        pastDaysCount++;
        const compliance = getDayCompliance(dateStr, false);
        totalDosesScheduled += compliance.totalScheduled;
        totalDosesTaken += compliance.totalTaken;
        totalDosesMissed += Math.max(0, compliance.totalScheduled - compliance.totalTaken - compliance.totalSkipped);
        if (compliance.totalScheduled > 0 && compliance.totalTaken >= compliance.totalScheduled) {
          daysWithFullCompliance++;
        }
      }
    }

    const overallRate = totalDosesScheduled > 0
      ? Math.round((totalDosesTaken / totalDosesScheduled) * 100)
      : 100;

    // Calculate current streak
    let currentStreak = 0;
    const checkDate = new Date();
    // Start checking backwards from today or yesterday
    for (let i = 0; i < 60; i++) {
      const d = new Date(checkDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const comp = getDayCompliance(dStr, false);
      if (comp.totalScheduled === 0) continue;
      if (comp.totalTaken >= comp.totalScheduled) {
        currentStreak++;
      } else {
        // If it's today and not fully taken yet, don't break streak if yesterday was full
        if (i === 0 && comp.totalTaken === 0) {
          continue;
        }
        break;
      }
    }

    return {
      totalDosesScheduled,
      totalDosesTaken,
      totalDosesMissed,
      overallRate: Math.min(overallRate, 100),
      daysWithFullCompliance,
      pastDaysCount,
      currentStreak
    };
  }, [year, month, todayStr, activeMedications, logsByDate]);

  // Selected Day Details
  const selectedDaySummary = useMemo(() => {
    const isFuture = selectedDate > todayStr;
    return getDayCompliance(selectedDate, isFuture);
  }, [selectedDate, todayStr, activeMedications, logsByDate]);

  const formattedSelectedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDate]);

  // Handle Mark Taken Quick Action
  const handleQuickMarkTaken = async (med: Medication, targetDate: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      await onLogIntake({
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        scheduledTime: med.time,
        takenDate: targetDate,
        takenTime: timeStr,
        status: 'taken'
      });
      triggerToast(`Recorded dose: ${med.name} (${timeStr})`);
    } catch {
      triggerToast(`Failed to record dose`);
    }
  };

  // Open Log Modal for custom editing
  const handleOpenLogModal = (med: Medication) => {
    setActiveLogMed(med);
    // If a log already exists for this med on selected date, prefill
    const existing = selectedDaySummary.logs.find((l) => l.medicationId === med.id);
    if (existing) {
      setLogTimeInput(existing.takenTime || med.time || '08:00');
      setLogStatusInput(existing.status);
      setLogNotesInput(existing.notes || '');
    } else {
      setLogTimeInput(med.time || '08:00');
      setLogStatusInput('taken');
      setLogNotesInput('');
    }
    setShowLogModal(true);
  };

  const handleSaveModalLog = async () => {
    if (!activeLogMed) return;
    const existing = selectedDaySummary.logs.find((l) => l.medicationId === activeLogMed.id);

    try {
      await onLogIntake({
        id: existing?.id,
        medicationId: activeLogMed.id,
        medicationName: activeLogMed.name,
        dosage: activeLogMed.dosage,
        scheduledTime: activeLogMed.time,
        takenDate: selectedDate,
        takenTime: logTimeInput,
        status: logStatusInput,
        notes: logNotesInput
      });
      setShowLogModal(false);
      triggerToast(`Updated intake record for ${activeLogMed.name}`);
    } catch {
      triggerToast(`Error saving intake record`);
    }
  };

  const handleRemoveLog = async (logId: string, medName: string) => {
    try {
      await onDeleteLog(logId);
      triggerToast(`Cleared intake log for ${medName}`);
    } catch {
      triggerToast(`Error clearing log`);
    }
  };

  // Export Compliance PDF
  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 18;

      // Header Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('MEDIMIND AI • CLINICAL MEDICATION COMPLIANCE REPORT', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Patient: ${displayPatientName} | Month: ${monthName} ${year} | Generated: ${new Date().toLocaleDateString()}`, 14, 20);

      y = 36;

      // Executive Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('MONTHLY ADHERENCE OVERVIEW', 20, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Overall Compliance Rate: ${monthStats.overallRate}%`, 20, y + 15);
      doc.text(`Total Doses Taken: ${monthStats.totalDosesTaken} / ${monthStats.totalDosesScheduled}`, 20, y + 21);
      doc.text(`Current Consecutive Adherence Streak: ${monthStats.currentStreak} Days`, 110, y + 15);
      doc.text(`Doses Missed / Needs Attention: ${monthStats.totalDosesMissed}`, 110, y + 21);

      y += 34;

      // Active Medications List
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('PRESCRIBED ACTIVE REGIMENS', 14, y);
      y += 6;

      medications.forEach((med, idx) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`${idx + 1}. ${med.name} (${med.dosage})`, 16, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Scheduled: ${med.time || 'Daily'} • ${med.frequency} | Instructions: ${med.instructions || 'As prescribed'}`, 16, y + 4.5);
        y += 10;
      });

      y += 4;

      // Day-by-Day Compliance Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('DAILY INTAKE AUDIT LOG', 14, y);
      y += 6;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Date', 18, y + 5);
      doc.text('Status', 50, y + 5);
      doc.text('Doses Taken', 85, y + 5);
      doc.text('Recorded Times & Medications', 125, y + 5);
      y += 9;

      const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const daysInThisMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInThisMonth; day++) {
        const dateStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
        if (dateStr > todayStr) break;

        const comp = getDayCompliance(dateStr, false);
        const dayLogs = comp.logs;

        if (y > 270) {
          doc.addPage();
          y = 16;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(dateStr, 18, y);

        // Status text
        if (comp.status === 'full') {
          doc.setTextColor(16, 185, 129);
          doc.text('100% Full', 50, y);
        } else if (comp.status === 'partial') {
          doc.setTextColor(217, 119, 6);
          doc.text('Partial', 50, y);
        } else if (comp.status === 'missed') {
          doc.setTextColor(225, 29, 72);
          doc.text('Missed', 50, y);
        } else {
          doc.setTextColor(148, 163, 184);
          doc.text('No meds', 50, y);
        }

        doc.setTextColor(71, 85, 105);
        doc.text(`${comp.totalTaken}/${comp.totalScheduled}`, 85, y);

        const logsStr = dayLogs.length > 0
          ? dayLogs.map((l) => `${l.medicationName} (${l.takenTime || 'Logged'})`).join(', ')
          : 'None recorded';
        const truncatedLogs = logsStr.length > 45 ? logsStr.substring(0, 42) + '...' : logsStr;
        doc.text(truncatedLogs, 125, y);

        doc.setDrawColor(241, 245, 249);
        doc.line(14, y + 2, pageWidth - 14, y + 2);
        y += 6;
      }

      // Doctor sign-off
      if (y > 250) {
        doc.addPage();
        y = 20;
      } else {
        y += 8;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Attending Physician / Caregiver Review Sign-off:", 14, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("Physician Signature: ___________________________   Date: _______________", 14, y);
      y += 8;
      doc.text("Notes: ___________________________________________________________________", 14, y);

      // Save PDF
      doc.save(`MediMind_Compliance_${displayPatientName.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`);
      triggerToast('Downloaded Medication Compliance PDF report');
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      triggerToast('Error generating PDF report');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className={`space-y-6 ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <i className="fas fa-circle-check text-emerald-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b ${
        darkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <button
            id="back-to-dashboard-from-calendar"
            type="button"
            onClick={onBack}
            className={`p-2 rounded-xl transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Medication Calendar
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                Historical Compliance
              </span>
              {careProfile && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  <i className="fas fa-heart text-[9px] mr-1"></i> {careProfile.name}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive adherence tracking, daily dosage verification, and clinical audit history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenMyMeds && (
            <button
              type="button"
              id="open-meds-management-btn"
              onClick={onOpenMyMeds}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <i className="fas fa-pills text-purple-500"></i>
              <span>Manage Prescriptions</span>
            </button>
          )}

          <button
            type="button"
            id="export-calendar-compliance-btn"
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <i className="fas fa-file-pdf"></i>
            <span>Doctor's Report</span>
          </button>
        </div>
      </div>

      {/* Compliance Analytics Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Monthly Adherence Rate */}
        <div className={`p-4 rounded-2xl border transition-all ${
          highContrast
            ? 'bg-slate-900 border-yellow-400'
            : darkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Monthly Adherence</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
              monthStats.overallRate >= 85
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
            }`}>
              <i className="fas fa-percent"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {monthStats.overallRate}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {monthStats.totalDosesTaken}/{monthStats.totalDosesScheduled} doses
            </span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                monthStats.overallRate >= 85 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${monthStats.overallRate}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 2: Current Streak */}
        <div className={`p-4 rounded-2xl border transition-all ${
          highContrast
            ? 'bg-slate-900 border-yellow-400'
            : darkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Current Streak</span>
            <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 flex items-center justify-center text-xs">
              <i className="fas fa-fire"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {monthStats.currentStreak}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">consecutive days</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {monthStats.currentStreak >= 7 ? 'Excellent consistency!' : 'Keep building your streak'}
          </p>
        </div>

        {/* Metric 3: Days Full Compliance */}
        <div className={`p-4 rounded-2xl border transition-all ${
          highContrast
            ? 'bg-slate-900 border-yellow-400'
            : darkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>100% Days</span>
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center text-xs">
              <i className="fas fa-calendar-check"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {monthStats.daysWithFullCompliance}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              of {monthStats.pastDaysCount} days
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            All doses completed on time
          </p>
        </div>

        {/* Metric 4: Missed Doses Alert */}
        <div className={`p-4 rounded-2xl border transition-all ${
          highContrast
            ? 'bg-slate-900 border-yellow-400'
            : darkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Attention Needed</span>
            <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center text-xs">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {monthStats.totalDosesMissed}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">missed doses</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {monthStats.totalDosesMissed === 0 ? 'Zero missed doses this month' : 'Tap day to review & log'}
          </p>
        </div>
      </div>

      {/* Main Layout: Calendar Grid + Day Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`p-5 rounded-3xl border ${
            highContrast
              ? 'bg-slate-900 border-yellow-400'
              : darkMode
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {/* Calendar Controls & Medication Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="prev-month-btn"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs transition"
                  title="Previous Month"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <h2 className="text-base sm:text-lg font-bold min-w-36 text-center">
                  {monthName} {year}
                </h2>
                <button
                  type="button"
                  id="next-month-btn"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs transition"
                  title="Next Month"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
                <button
                  type="button"
                  id="today-btn"
                  onClick={handleGoToToday}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Today
                </button>
              </div>

              {/* Filter By Medication Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0">Filter:</span>
                <select
                  id="medication-filter-select"
                  value={selectedMedFilter}
                  onChange={(e) => setSelectedMedFilter(e.target.value)}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border outline-none w-full sm:w-48 ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Prescriptions ({medications.length})</option>
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosage})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-[11px] font-bold text-slate-400 py-1 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label="Medication Calendar">
              {calendarDays.map((day) => {
                const isSelected = day.dateStr === selectedDate;
                const compliance = getDayCompliance(day.dateStr, day.isFuture);

                // Styling based on compliance status
                let badgeColor = '';
                let badgeIcon = '';
                let badgeLabel = '';

                if (compliance.status === 'full') {
                  badgeColor = 'bg-emerald-500 text-white';
                  badgeIcon = 'fa-check';
                  badgeLabel = `${compliance.totalTaken}/${compliance.totalScheduled}`;
                } else if (compliance.status === 'partial') {
                  badgeColor = 'bg-amber-500 text-white';
                  badgeIcon = 'fa-exclamation';
                  badgeLabel = `${compliance.totalTaken}/${compliance.totalScheduled}`;
                } else if (compliance.status === 'missed') {
                  badgeColor = 'bg-rose-500 text-white';
                  badgeIcon = 'fa-times';
                  badgeLabel = 'Missed';
                } else if (compliance.status === 'scheduled') {
                  badgeColor = 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
                  badgeIcon = 'fa-clock';
                  badgeLabel = `${compliance.totalScheduled}`;
                }

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    id={`calendar-day-${day.dateStr}`}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`min-h-16 sm:min-h-20 p-1.5 rounded-2xl flex flex-col justify-between items-start transition-all relative border text-left ${
                      !day.isCurrentMonth ? 'opacity-35' : ''
                    } ${
                      isSelected
                        ? 'ring-2 ring-blue-500 border-blue-500 shadow-md scale-[1.02] z-10 ' +
                          (darkMode ? 'bg-blue-950/40' : 'bg-blue-50/70')
                        : day.isToday
                        ? 'border-emerald-500 ' + (darkMode ? 'bg-slate-800/80' : 'bg-slate-50')
                        : darkMode
                        ? 'border-slate-800/80 hover:bg-slate-800/50 bg-slate-900/60'
                        : 'border-slate-100 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    {/* Top Row: Day Number + Today Tag */}
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-extrabold ${
                          day.isToday
                            ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] sm:text-xs'
                            : isSelected
                            ? 'text-blue-600 dark:text-blue-400'
                            : ''
                        }`}
                      >
                        {day.dayNum}
                      </span>

                      {/* Mini Pill Dots Indicator */}
                      {compliance.totalScheduled > 0 && (
                        <div className="flex items-center gap-0.5">
                          {activeMedications.slice(0, 3).map((m, idx) => {
                            const isTaken = compliance.logs.some(
                              (l) => l.medicationId === m.id && l.status === 'taken'
                            );
                            return (
                              <span
                                key={m.id || idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isTaken
                                    ? 'bg-emerald-500'
                                    : day.isFuture
                                    ? 'bg-blue-400'
                                    : 'bg-rose-400'
                                }`}
                                title={`${m.name}: ${isTaken ? 'Taken' : day.isFuture ? 'Scheduled' : 'Missed'}`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Compliance Badge */}
                    <div className="w-full mt-1">
                      {badgeLabel && (
                        <span
                          className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 w-fit max-w-full truncate ${badgeColor}`}
                        >
                          <i className={`fas ${badgeIcon} text-[8px]`}></i>
                          <span className="hidden sm:inline">{badgeLabel}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 flex-wrap pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Full Adherence (100%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Partial Intake</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Missed Dose</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                <span>Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Day Intake Status Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 rounded-3xl border ${
            highContrast
              ? 'bg-slate-900 border-yellow-400'
              : darkMode
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {/* Selected Date Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {selectedDate === todayStr
                    ? 'Today’s Schedule'
                    : selectedDate > todayStr
                    ? 'Upcoming Day'
                    : 'Historical Record'}
                </span>
                <h3 className="font-extrabold text-base sm:text-lg">
                  {formattedSelectedDate}
                </h3>
              </div>

              {/* Day Compliance Pill */}
              <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                selectedDaySummary.status === 'full'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : selectedDaySummary.status === 'partial'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : selectedDaySummary.status === 'missed'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                <i className={`fas ${
                  selectedDaySummary.status === 'full'
                    ? 'fa-circle-check text-emerald-600'
                    : selectedDaySummary.status === 'partial'
                    ? 'fa-circle-exclamation text-amber-600'
                    : selectedDaySummary.status === 'missed'
                    ? 'fa-circle-xmark text-rose-600'
                    : 'fa-calendar-day text-blue-600'
                }`}></i>
                <span>
                  {selectedDaySummary.status === 'full'
                    ? '100% Adherent'
                    : selectedDaySummary.status === 'partial'
                    ? `${selectedDaySummary.totalTaken}/${selectedDaySummary.totalScheduled} Taken`
                    : selectedDaySummary.status === 'missed'
                    ? 'Missed Doses'
                    : 'Scheduled'}
                </span>
              </div>
            </div>

            {/* Adherence Progress Bar for the Day */}
            <div className="py-3">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">Intake Progress</span>
                <span className="font-bold">
                  {selectedDaySummary.totalTaken} of {selectedDaySummary.totalScheduled} doses recorded
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    selectedDaySummary.status === 'full'
                      ? 'bg-emerald-500'
                      : selectedDaySummary.status === 'partial'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${selectedDaySummary.totalScheduled > 0
                      ? (selectedDaySummary.totalTaken / selectedDaySummary.totalScheduled) * 100
                      : 0}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Prescriptions List for Selected Date */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Scheduled Dosages ({activeMedications.length})
              </h4>

              {activeMedications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <i className="fas fa-prescription-bottle text-2xl mb-2 text-slate-300 dark:text-slate-700"></i>
                  <p>No active medications scheduled for this filter.</p>
                </div>
              ) : (
                activeMedications.map((med) => {
                  const existingLog = selectedDaySummary.logs.find((l) => l.medicationId === med.id);
                  const isTaken = existingLog?.status === 'taken';
                  const isSkipped = existingLog?.status === 'skipped';
                  const isMissed = existingLog?.status === 'missed' || (!existingLog && selectedDate < todayStr);

                  return (
                    <div
                      key={med.id}
                      id={`day-med-item-${med.id}`}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isTaken
                          ? darkMode
                            ? 'bg-emerald-950/20 border-emerald-800/40'
                            : 'bg-emerald-50/50 border-emerald-200'
                          : isMissed
                          ? darkMode
                            ? 'bg-rose-950/20 border-rose-800/40'
                            : 'bg-rose-50/40 border-rose-200'
                          : darkMode
                          ? 'bg-slate-800/40 border-slate-800'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm">{med.name}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {med.dosage}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-mono font-semibold">
                              <i className="far fa-clock text-[10px]"></i>
                              {med.time || 'Daily'}
                            </span>
                            <span>•</span>
                            <span>{med.frequency}</span>
                          </div>

                          {/* Pill Appearance / Instructions Note */}
                          {med.pillAppearance && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                              <i className="fas fa-eye text-[9px] mr-1 text-slate-400"></i>
                              {med.pillAppearance}
                            </p>
                          )}
                          {med.instructions && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {med.instructions}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isTaken ? (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                              <i className="fas fa-circle-check text-emerald-600"></i>
                              <span>Taken {existingLog?.takenTime ? `(${existingLog.takenTime})` : ''}</span>
                            </span>
                          ) : isSkipped ? (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                              <i className="fas fa-forward"></i>
                              <span>Skipped</span>
                            </span>
                          ) : isMissed ? (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 shrink-0">
                              <i className="fas fa-circle-xmark text-rose-600"></i>
                              <span>Missed</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 shrink-0">
                              <i className="far fa-clock"></i>
                              <span>Scheduled</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Dose Controls */}
                      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex-wrap">
                        {!isTaken ? (
                          <button
                            type="button"
                            id={`mark-taken-quick-${med.id}`}
                            onClick={() => handleQuickMarkTaken(med, selectedDate)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <i className="fas fa-check"></i>
                            <span>Mark Taken</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`edit-intake-${med.id}`}
                            onClick={() => handleOpenLogModal(med)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition"
                          >
                            <i className="fas fa-pen text-[10px] mr-1"></i> Edit Time
                          </button>
                        )}

                        <button
                          type="button"
                          id={`custom-log-btn-${med.id}`}
                          onClick={() => handleOpenLogModal(med)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition text-slate-600 dark:text-slate-300"
                        >
                          <i className="fas fa-sliders text-[10px] mr-1"></i> Details / Notes
                        </button>

                        {existingLog && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLog(existingLog.id, med.name)}
                            className="text-[11px] text-slate-400 hover:text-rose-500 transition ml-auto"
                            title="Reset log for this day"
                          >
                            <i className="fas fa-rotate-left mr-1"></i> Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Custom Intake Log / Time Picker */}
      {showLogModal && activeLogMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center text-sm">
                  <i className="fas fa-clock"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Record Intake Details</h3>
                  <p className="text-xs text-slate-500">{activeLogMed.name} ({activeLogMed.dosage})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Intake Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['taken', 'missed', 'skipped'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setLogStatusInput(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border text-center ${
                        logStatusInput === st
                          ? st === 'taken'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'missed'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-600 text-white border-slate-600'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {logStatusInput === 'taken' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Time Taken on {selectedDate}
                  </label>
                  <input
                    type="time"
                    id="log-time-picker-input"
                    value={logTimeInput}
                    onChange={(e) => setLogTimeInput(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none text-center ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  {/* Quick Presets */}
                  <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLogTimeInput(
                          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                        )
                      }
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      Just Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogTimeInput(activeLogMed.time || '08:00')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      Scheduled ({activeLogMed.time || '08:00'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogTimeInput('08:00')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      Morning (08:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogTimeInput('13:00')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      Noon (13:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogTimeInput('20:00')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      Night (20:00)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Clinical Notes / Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={logNotesInput}
                  onChange={(e) => setLogNotesInput(e.target.value)}
                  placeholder="e.g. Taken with breakfast. Mild nausea subsided after 30 mins."
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="save-modal-log-btn"
                onClick={handleSaveModalLog}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <i className="fas fa-check"></i>
                <span>Save Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Export Doctor's Report */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center text-sm">
                  <i className="fas fa-file-medical"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Doctor’s Compliance Report</h3>
                  <p className="text-xs text-slate-500">{monthName} {year} • {displayPatientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                This document generates a structured PDF containing your prescription adherence percentage, complete dose intake logs, and clinical timestamps for your physician or caregiver review.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reporting Patient:</span>
                  <span className="font-bold">{displayPatientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Period:</span>
                  <span className="font-bold">{monthName} {year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Adherence Score:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{monthStats.overallRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Prescriptions:</span>
                  <span className="font-bold">{medications.length} regimens</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-download-calendar-pdf"
                disabled={isExportingPDF}
                onClick={handleExportPDF}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
              >
                <i className={`fas ${isExportingPDF ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
