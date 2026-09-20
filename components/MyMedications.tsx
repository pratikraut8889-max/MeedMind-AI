import React, { useState, useEffect } from 'react';
import { Medication } from '../types';
import { MedicationAlarm, MedicationAlarmAlert } from '../services/medicationAlarmService';
import { SoundService } from '../services/audioService';

interface MyMedicationsProps {
  medications: Medication[];
  onAdd: () => void;
  onTake: (id: string) => void;
  onDelete?: (id: string) => void;
  highContrast: boolean;
  darkMode: boolean;
}

export const MyMedications: React.FC<MyMedicationsProps> = ({
  medications,
  onAdd,
  onTake,
  onDelete,
  highContrast,
  darkMode
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeAlert, setActiveAlert] = useState<MedicationAlarmAlert | null>(null);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

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

  const todayStr = new Date().toISOString().split('T')[0];

  const cardBg = highContrast
    ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
    : darkMode
    ? 'bg-slate-800 border border-slate-700 text-white'
    : 'bg-white border border-slate-100 shadow-sm text-slate-800';

  return (
    <div className={`h-full flex flex-col ${highContrast ? 'text-yellow-300' : darkMode ? 'text-white' : 'text-slate-800'}`}>
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
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h2 className="text-2xl font-bold">My Medications</h2>
          <p className="text-xs opacity-60">Scheduled reminders and automated alarms</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Medication List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-24 scrollbar-hide">
        {medications.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center ${cardBg}`}>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3 text-2xl">
              <i className="fas fa-pills"></i>
            </div>
            <h3 className="font-bold text-base mb-1">No Medications Scheduled</h3>
            <p className="text-xs opacity-60 mb-5 max-w-sm mx-auto">
              Scan your pill bottle with your camera or add medication details manually to receive scheduled reminders.
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
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isTakenToday
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      <i className={`fas ${isTakenToday ? 'fa-check' : 'fa-pills'}`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-snug">{m.name}</h3>
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

                {/* Instructions & Timing bar */}
                <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 dark:bg-slate-700 text-[11px] flex items-center gap-1">
                      <i className="fas fa-clock text-[10px] text-blue-500"></i>
                      {m.time}
                    </span>
                    {m.instructions && (
                      <span className="opacity-70 text-[11px] line-clamp-1 italic max-w-xs">
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
