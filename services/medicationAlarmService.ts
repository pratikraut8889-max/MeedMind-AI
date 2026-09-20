import { Medication } from '../types';
import { SoundService } from './audioService';

export interface MedicationAlarmAlert {
  medication: Medication;
  scheduledTime: string;
  triggerTimestamp: number;
}

class MedicationAlarmManager {
  private intervalId: any = null;
  private snoozedAlerts: Map<string, number> = new Map(); // medId -> timestamp when snooze expires
  private onTriggerCallback: ((alert: MedicationAlarmAlert) => void) | null = null;
  private alertedToday: Set<string> = new Set(); // medId-YYYY-MM-DD-HH:MM

  // Request browser notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch (e) {
      console.warn("Error requesting notification permission:", e);
      return 'denied';
    }
  }

  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Trigger browser push/local notification
  showNotification(title: string, options?: NotificationOptions) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/manifest.json',
          badge: '/manifest.json',
          ...options
        });
      } catch (e) {
        console.warn("Notification trigger failed:", e);
      }
    }
  }

  // Start background monitoring of medication times
  startMonitoring(
    getMedications: () => Medication[],
    onTrigger: (alert: MedicationAlarmAlert) => void
  ) {
    this.onTriggerCallback = onTrigger;
    if (this.intervalId) clearInterval(this.intervalId);

    const checkSchedule = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = now.toISOString().split('T')[0];

      const meds = getMedications();

      meds.forEach(med => {
        const key = `${med.id}-${todayStr}-${med.time}`;

        // Check if snoozed
        const snoozeExpiry = this.snoozedAlerts.get(med.id);
        const isSnoozedDue = snoozeExpiry && Date.now() >= snoozeExpiry;

        // Check if regular scheduled time matches and hasn't been alerted today
        const isTimeMatch = med.time === currentTimeStr && !this.alertedToday.has(key);
        // Only trigger if not already taken today
        const notTakenToday = med.lastTakenDate !== todayStr;

        if ((isTimeMatch && notTakenToday) || isSnoozedDue) {
          if (isSnoozedDue) {
            this.snoozedAlerts.delete(med.id);
          } else {
            this.alertedToday.add(key);
          }

          // Play audible chime
          SoundService.playMedicationChime();

          // Trigger browser notification
          this.showNotification(`Time to take ${med.name}`, {
            body: `Dosage: ${med.dosage}. ${med.instructions || 'Scheduled time: ' + med.time}`,
            tag: `med-${med.id}-${Date.now()}`,
            requireInteraction: true
          });

          // Callback to app UI
          if (this.onTriggerCallback) {
            this.onTriggerCallback({
              medication: med,
              scheduledTime: med.time,
              triggerTimestamp: Date.now()
            });
          }
        }
      });
    };

    // Run check every 15 seconds
    checkSchedule();
    this.intervalId = setInterval(checkSchedule, 15000);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Snooze an alarm for specified minutes (default 5 minutes)
  snooze(medicationId: string, minutes: number = 5) {
    const expiry = Date.now() + minutes * 60 * 1000;
    this.snoozedAlerts.set(medicationId, expiry);
  }

  // Manually test alarm and chime for a specific medication or sample
  testAlarm(medication?: Medication) {
    SoundService.playMedicationChime();
    const testMed: Medication = medication || {
      id: 'test-med',
      name: 'Sample Reminder (e.g. Lisinopril)',
      dosage: '10mg',
      frequency: 'Daily',
      time: '08:00',
      instructions: 'Take 1 tablet with a glass of water after breakfast.',
      lastTakenDate: null,
      lastNotificationDate: null
    };

    this.showNotification(`🔔 Test Reminder: ${testMed.name}`, {
      body: `Dosage: ${testMed.dosage} • ${testMed.instructions}`,
      requireInteraction: false
    });

    if (this.onTriggerCallback) {
      this.onTriggerCallback({
        medication: testMed,
        scheduledTime: testMed.time,
        triggerTimestamp: Date.now()
      });
    }
  }
}

export const MedicationAlarm = new MedicationAlarmManager();
