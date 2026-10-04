import React, { useState, useEffect } from 'react';
import { Medication } from '../types';
import { MedicationAlarm, MedicationAlarmAlert } from '../services/medicationAlarmService';
import { SoundService } from '../services/audioService';
import { PDFExportService } from '../services/pdfExportService';

interface MyMedicationsProps {
  medications: Medication[];
  onAdd: () => void;
  onTake: (id: string) => void;
  onDelete?: (id: string) => void;
  highContrast: boolean;
  darkMode: boolean;
  patientName?: string;
}

export const MyMedications: React.FC<MyMedicationsProps> = ({
  medications,
  onAdd,
  onTake,
  onDelete,
  highContrast,
  darkMode,
  patientName = ''
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeAlert, setActiveAlert] = useState<MedicationAlarmAlert | null>(null);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // PDF Schedule Export State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulePatientName, setSchedulePatientName] = useState(patientName);
  const [scheduleDoctorName, setScheduleDoctorName] = useState('');
  const [schedulePharmacy, setSchedulePharmacy] = useState('');
  const [includeChecklist, setIncludeChecklist] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedPillPhoto, setSelectedPillPhoto] = useState<string | null>(null);

  useEffect(() => {
    setPermission(MedicationAlarm.getPermission());

    // Register active background check for alarms
    MedicationAlarm.startMonitoring(
      () => medications,
      (alert) => {
        setActiveAlert(alert);
      }
    );

    return () => {
      MedicationAlarm.stopMonitoring();
    };
  }, [medications]);

  useEffect(() => {
    if (patientName && !schedulePatientName) {
      setSchedulePatientName(patientName);
    }
  }, [patientName]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleRequestPermission = async () => {
    const res = await MedicationAlarm.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      MedicationAlarm.showNotification('MediMind Reminders Enabled', {
        body: 'You will receive alarms and notifications when your medication is due.'
      });
      SoundService.playSuccessTone();
    }
  };

  const handleTestAlarm = (med?: Medication) => {
    MedicationAlarm.testAlarm(med);
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const handleSnooze = (medId: string) => {
    MedicationAlarm.snooze(medId, 5);
    setActiveAlert(null);
  };

  const handleMarkTakenFromAlert = (medId: string) => {
    onTake(medId);
    SoundService.playSuccessTone();
    setActiveAlert(null);
  };

  const handleExportSchedule = async () => {
    setIsExportingPDF(true);
    try {
      const fileName = PDFExportService.exportMedicationSchedule(medications, {
        patientName: schedulePatientName.trim() || 'Confidential Patient',
        doctorName: scheduleDoctorName.trim() || undefined,
        pharmacyName: schedulePharmacy.trim() || undefined,
        includeChecklist
      });
      showToast(`Medication schedule exported: ${fileName}`);
      setShowScheduleModal(false);
    } catch (err: any) {
      console.error('Failed to export medication schedule:', err);
      showToast('Could not generate PDF schedule. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const cardBg = highContrast
    ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
    : darkMode
    ? 'bg-slate-800 border border-slate-700 text-white'
    : 'bg-white border border-slate-100 shadow-sm text-slate-800';

  return (
    <div className={`h-full flex flex-col ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <i className="fas fa-check-circle text-emerald-400"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Pill Photo Enlarge Modal */}
      {selectedPillPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPillPhoto(null)}
        >
          <div
            className={`max-w-md w-full rounded-2xl p-4 shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <i className="fas fa-pills text-blue-500"></i>
                <h4 className="font-bold text-sm">Physical Pill Visual Verification</h4>
              </div>
              <button
                onClick={() => setSelectedPillPhoto(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black/90 flex items-center justify-center max-h-[350px]">
              <img src={selectedPillPhoto} alt="Physical Pill" className="max-h-[350px] w-auto object-contain" />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              Visual verification image captured with device camera
            </p>
          </div>
        </div>
      )}

      {/* Printable Medication Schedule PDF Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-base">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Printable Medication Schedule (PDF)</h3>
                  <p className="text-[11px] text-slate-500">Clinical timetable, instructions & weekly adherence tracker</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
                <p className="font-medium text-[11px] leading-relaxed">
                  This exports all <strong>{medications.length} active prescriptions</strong> with dosage amounts, scheduled intake times, specific food & clinical instructions, and physical pill identifiers into a formatted PDF designed for printing or doctor sharing.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">Patient Name</label>
                <input
                  type="text"
                  value={schedulePatientName}
                  onChange={(e) => setSchedulePatientName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Prescribing Physician (Optional)</label>
                  <input
                    type="text"
                    value={scheduleDoctorName}
                    onChange={(e) => setScheduleDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Robert Chen, MD"
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Dispensing Pharmacy (Optional)</label>
                  <input
                    type="text"
                    value={schedulePharmacy}
                    onChange={(e) => setSchedulePharmacy(e.target.value)}
                    placeholder="e.g. CVS Pharmacy #4012"
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeChecklist}
                    onChange={(e) => setIncludeChecklist(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">
                      Include Weekly Printable Adherence Tracker Grid
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Adds Monday–Sunday checkboxes so you or a caregiver can check off daily doses on paper.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-download-schedule-pdf"
                disabled={isExportingPDF || medications.length === 0}
                onClick={handleExportSchedule}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-500/20"
              >
                <i className={`fas ${isExportingPDF ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                <span>{isExportingPDF ? 'Generating PDF...' : 'Download Printable PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alarm Modal */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl relative shadow-2xl border-2 border-blue-500 ${cardBg}`}>
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl mx-auto mb-4 animate-bounce">
              <i className="fas fa-bell"></i>
            </div>
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-500">
                Scheduled Medication Alarm
              </span>
              <h3 className="text-2xl font-bold mt-2">{activeAlert.medication.name}</h3>
              <p className="text-sm font-medium opacity-80">{activeAlert.medication.dosage} • Scheduled: {activeAlert.scheduledTime}</p>
              {activeAlert.medication.instructions && (
                <div className="mt-3 p-3 rounded-xl bg-blue-500/10 text-xs text-left">
                  <span className="font-bold block mb-0.5">Instructions:</span>
                  {activeAlert.medication.instructions}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleMarkTakenFromAlert(activeAlert.medication.id)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <i className="fas fa-check-circle"></i> Mark as Taken Now
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSnooze(activeAlert.medication.id)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <i className="fas fa-clock"></i> Snooze (5 min)
                </button>
                <button
                  onClick={() => setActiveAlert(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 shrink-0">
        <div>
          <h2 className="text-2xl font-bold">My Medications</h2>
          <p className="text-xs opacity-60">Scheduled reminders, automated alarms & printable adherence regimens</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="print-medication-schedule-btn"
            onClick={() => setShowScheduleModal(true)}
            title="Generate printable PDF schedule of all active medications"
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              darkMode
                ? 'border-indigo-700/60 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <i className="fas fa-file-pdf text-indigo-500"></i>
            <span>Print Schedule (PDF)</span>
          </button>

          <button
            onClick={() => handleTestAlarm()}
            title="Test chime and reminder alarm"
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <i className={`fas fa-volume-up ${testNotificationSent ? 'text-green-500 animate-pulse' : 'text-blue-500'}`}></i>
            <span className="hidden sm:inline">Test Sound</span>
          </button>

          <button
            id="add-medication-btn"
            onClick={onAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <i className="fas fa-plus"></i> Add Med
          </button>
        </div>
      </div>

      {/* Push Notification Alarm Permission Banner */}
      <div className="mb-4 shrink-0">
        {permission !== 'granted' ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <i className="fas fa-bell"></i>
              </div>
              <div>
                <p className="text-xs font-bold">Enable Medication Alarms</p>
                <p className="text-[11px] opacity-70">Get audible chime alerts when it's time for your medication.</p>
              </div>
            </div>
            <button
              onClick={handleRequestPermission}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 transition"
            >
              Turn On
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
            <span className="flex items-center gap-1.5">
              <i className="fas fa-check-circle"></i> Audio Chime & Push Reminders Active
            </span>
            <button
              onClick={() => handleTestAlarm()}
              className="font-bold underline text-[11px] hover:opacity-80"
            >
              Trigger Test
            </button>
          </div>
        )}
      </div>

      {/* Quick Printable Schedule Callout Banner (when medications exist) */}
      {medications.length > 0 && (
        <div className="mb-4 shrink-0 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Printable Active Medication Schedule</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Generate a formatted, clinical PDF timetable with dosage times, instructions & weekly adherence tracking.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <i className="fas fa-file-pdf"></i>
            <span>Export Schedule PDF</span>
          </button>
        </div>
      )}

      {/* Medication List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-24 scrollbar-hide">
        {medications.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center ${cardBg}`}>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3 text-2xl">
              <i className="fas fa-pills"></i>
            </div>
            <h3 className="font-bold text-base mb-1">No Medications Scheduled</h3>
            <p className="text-xs opacity-60 mb-5 max-w-sm mx-auto">
              Scan your pill bottle label or physical pill with your camera to receive scheduled reminders and printable PDF schedules.
            </p>
            <button
              onClick={onAdd}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> Add First Medication
            </button>
          </div>
        ) : (
          medications.map((m) => {
            const isTakenToday = m.lastTakenDate === todayStr;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isTakenToday
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-l-4 border-l-blue-500'
                } ${cardBg} flex flex-col gap-3`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    {/* Visual Pill Photo Thumbnail if captured */}
                    {m.pillPhoto ? (
                      <div
                        onClick={() => setSelectedPillPhoto(m.pillPhoto!)}
                        className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer group shadow-sm"
                        title="Click to view full-resolution physical pill photo"
                      >
                        <img
                          src={m.pillPhoto}
                          alt={m.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                          <i className="fas fa-search-plus"></i>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isTakenToday
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        <i className={`fas ${isTakenToday ? 'fa-check' : 'fa-pills'}`}></i>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base leading-snug">{m.name}</h3>
                        {m.pillPhoto && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center gap-1">
                            <i className="fas fa-camera text-[9px]"></i> Pill Photo
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-75 font-medium">{m.dosage} • {m.frequency}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTestAlarm(m)}
                      title="Test alarm for this medication"
                      className="p-1.5 rounded-lg text-xs opacity-60 hover:opacity-100 hover:text-blue-500 transition"
                    >
                      <i className="fas fa-bell"></i>
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(m.id)}
                        title="Delete medication"
                        className="p-1.5 rounded-lg text-xs opacity-60 hover:opacity-100 hover:text-red-500 transition"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Pill Visual Verification Details if available */}
                {(m.pillAppearance || m.pillColor || m.pillShape || m.pillImprint) && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <i className="fas fa-shield-check text-emerald-500 text-xs shrink-0"></i>
                    <span className="font-medium">
                      Pill Verification:{' '}
                      <span className="opacity-90">
                        {m.pillAppearance ||
                          [
                            m.pillColor,
                            m.pillShape,
                            m.pillImprint ? `Imprint: "${m.pillImprint}"` : null
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                      </span>
                    </span>
                  </div>
                )}

                {/* Instructions & Timing bar */}
                <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 dark:bg-slate-700 text-[11px] flex items-center gap-1">
                      <i className="fas fa-clock text-[10px] text-blue-500"></i>
                      {m.time}
                    </span>
                    {m.instructions && (
                      <span className="opacity-70 text-[11px] italic max-w-sm">
                        {m.instructions}
                      </span>
                    )}
                  </div>

                  {isTakenToday ? (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <i className="fas fa-circle-check"></i> Taken Today
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onTake(m.id);
                        SoundService.playSuccessTone();
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 shadow-sm"
                    >
                      <i className="fas fa-check"></i> Mark Taken
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
