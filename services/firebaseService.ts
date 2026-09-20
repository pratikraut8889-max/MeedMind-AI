import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Medication, MoodEntry, StoredReport, Vaccine, HealthHistory } from '../types';

// Google Auth Provider setup
const googleProvider = new GoogleAuthProvider();

export const FirebaseService = {
  // Validate basic connection on boot
  async validateConnection(): Promise<boolean> {
    try {
      // Perform a getDocFromServer to verify connectivity as strictly mandated by the skill instructions
      await getDocFromServer(doc(db, 'test_connection', 'connection'));
      return true;
    } catch (error) {
      // Silence offline errors if the document just doesn't exist, but log connectivity issues
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Firebase connection test failed: client is offline.");
        return false;
      }
      return true;
    }
  },

  // --- Auth Methods ---

  // Register with Email & Password
  async registerWithEmail(email: string, password: string): Promise<User> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return credential.user;
    } catch (error) {
      console.error("Auth Register Error:", error);
      throw error;
    }
  },

  // Sign In with Email & Password
  async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential.user;
    } catch (error) {
      console.error("Auth Login Error:", error);
      throw error;
    }
  },

  // Google Login via PopUp
  async loginWithGoogle(): Promise<User> {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      return credential.user;
    } catch (error) {
      console.error("Auth Google Login Error:", error);
      throw error;
    }
  },

  // Password Reset
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password Reset Error:", error);
      throw error;
    }
  },

  // Sign Out
  async logoutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign Out Error:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    return this.logoutUser();
  },

  // --- Firestore Sync Methods ---

  // User Profile
  async saveUserProfile(userId: string, data: { email: string; displayName?: string; location?: string; accessibilitySettings?: any }) {
    const path = `users/${userId}`;
    try {
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: data.email,
        displayName: data.displayName || null,
        location: data.location || null,
        accessibilitySettings: data.accessibilitySettings || null
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserProfile(userId: string) {
    const path = `users/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  // Medications
  subscribeMedications(userId: string, callback: (meds: Medication[]) => void) {
    const path = `users/${userId}/medications`;
    const q = collection(db, 'users', userId, 'medications');
    return onSnapshot(q, (snap) => {
      const list: Medication[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as Medication);
      });
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async addMedication(userId: string, med: Medication) {
    const path = `users/${userId}/medications/${med.id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'medications', med.id), med);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateMedication(userId: string, medId: string, updates: Partial<Medication>) {
    const path = `users/${userId}/medications/${medId}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'medications', medId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteMedication(userId: string, medId: string) {
    const path = `users/${userId}/medications/${medId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'medications', medId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Mood Logs
  subscribeMoodLogs(userId: string, callback: (moods: MoodEntry[]) => void) {
    const path = `users/${userId}/moods`;
    const q = collection(db, 'users', userId, 'moods');
    return onSnapshot(q, (snap) => {
      const list: MoodEntry[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as MoodEntry);
      });
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async saveMoodLog(userId: string, entry: MoodEntry) {
    const docId = entry.date; // Use date as document ID so only one mood exists per day
    const path = `users/${userId}/moods/${docId}`;
    try {
      await setDoc(doc(db, 'users', userId, 'moods', docId), entry);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Reports
  subscribeReports(userId: string, callback: (reports: StoredReport[]) => void) {
    const path = `users/${userId}/reports`;
    const q = collection(db, 'users', userId, 'reports');
    return onSnapshot(q, (snap) => {
      const list: StoredReport[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as StoredReport);
      });
      // Sort by date descending
      list.sort((a, b) => b.date - a.date);
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async addReport(userId: string, report: StoredReport) {
    const path = `users/${userId}/reports/${report.id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'reports', report.id), report);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteReport(userId: string, reportId: string) {
    const path = `users/${userId}/reports/${reportId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'reports', reportId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Vaccines
  subscribeVaccines(userId: string, callback: (vaccines: Vaccine[]) => void) {
    const path = `users/${userId}/vaccines`;
    const q = collection(db, 'users', userId, 'vaccines');
    return onSnapshot(q, (snap) => {
      const list: Vaccine[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as Vaccine);
      });
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async saveVaccine(userId: string, vaccine: Vaccine) {
    const path = `users/${userId}/vaccines/${vaccine.id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'vaccines', vaccine.id), vaccine);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateVaccine(userId: string, vaccineId: string, updates: Partial<Vaccine>) {
    const path = `users/${userId}/vaccines/${vaccineId}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'vaccines', vaccineId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteVaccine(userId: string, vaccineId: string) {
    const path = `users/${userId}/vaccines/${vaccineId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'vaccines', vaccineId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Health History (Single Document)
  subscribeHealthHistory(userId: string, callback: (history: HealthHistory | null) => void) {
    const path = `users/${userId}/healthHistory/main`;
    return onSnapshot(doc(db, 'users', userId, 'healthHistory', 'main'), (snap) => {
      callback(snap.exists() ? (snap.data() as HealthHistory) : null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async saveHealthHistory(userId: string, history: HealthHistory) {
    const path = `users/${userId}/healthHistory/main`;
    try {
      await setDoc(doc(db, 'users', userId, 'healthHistory', 'main'), history);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
};
