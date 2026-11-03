import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDocs,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { LessonSession, Student, GradeLevel } from '../types';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAoaLsLkyfdE9u6jh4If2oho1yCnJLB6Js',
  authDomain: 'tutor-schedule-90593.firebaseapp.com',
  projectId: 'tutor-schedule-90593',
  storageBucket: 'tutor-schedule-90593.firebasestorage.app',
  messagingSenderId: '63045031270',
  appId: '1:63045031270:web:47cf28432bc839e7f964a7',
};

// Website edit password
export const SITE_EDIT_PASSWORD = '121402';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let authPromise: Promise<unknown> | null = null;

export function getFirebaseInstance() {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    auth = getAuth(app);
    authPromise = signInAnonymously(auth).catch((err) => {
      console.warn('Anonymous sign-in to tutor-schedule-90593 warning:', err);
    });
  }
  return { app, db, auth, authPromise };
}

// Day mapping helper (Monday = 0, Sunday = 6)
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type DayName = (typeof DAY_NAMES)[number];

// Calculate the Monday of the week for any given Date
export function getMondayOfWeek(dateInput: Date | string): Date {
  const d = new Date(dateInput);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Convert Date to YYYY-MM-DD
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Format week label like "Nov 02 - Nov 08" or "Jul 06 - Jul 12"
export function formatWeekLabel(mondayDate: Date): string {
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);

  const startMonth = mondayDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = String(mondayDate.getDate()).padStart(2, '0');
  const endMonth = sundayDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = String(sundayDate.getDate()).padStart(2, '0');

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

// Format month header like "November 2026"
export function formatMonthHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Generate the 7 days of the week starting from Monday
export function getWeekDates(mondayDate: Date) {
  return DAY_NAMES.map((name, index) => {
    const current = new Date(mondayDate);
    current.setDate(current.getDate() + index);
    const dateStr = formatDateISO(current);
    const dayNumber = String(current.getDate()).padStart(2, '0');
    const shortDayName = name.slice(0, 3); // "Mon", "Tue", ...
    return {
      dayName: name,
      shortName: shortDayName,
      dateStr,
      dayNumber,
      fullDate: current,
    };
  });
}

// Map Firestore document data to our LessonSession type
export function mapFirestoreDocToSession(
  docId: string,
  raw: Record<string, unknown>,
  mondayDate: Date
): LessonSession {
  const dayName = (raw.day as DayName) || 'Monday';
  const dayIndex = DAY_NAMES.indexOf(dayName);
  const sessionDate = new Date(mondayDate);
  sessionDate.setDate(sessionDate.getDate() + (dayIndex >= 0 ? dayIndex : 0));
  const dateStr = formatDateISO(sessionDate);

  const rawGrade = String(raw.grade || 'Grade 7');
  const gradeDigits = rawGrade.replace(/[^0-9]/g, '');
  const parsedGrade = parseInt(gradeDigits, 10);
  const gradeLevel: GradeLevel =
    parsedGrade >= 1 && parsedGrade <= 12 ? (parsedGrade as GradeLevel) : 7;

  const time = (raw.time as string) || '09:00';
  const [hStr, mStr] = time.split(':');
  let hNum = parseInt(hStr || '9', 10);
  const isPm = hNum >= 12;
  const h12 = hNum % 12 || 12;
  const displayTime = `${String(h12).padStart(2, '0')}:${mStr || '00'} ${isPm ? 'PM' : 'AM'}`;

  const studentName = String(raw.student || 'Student');
  const isReserved = studentName.toLowerCase().includes('reserved');
  const isAttention = (raw.note as string)?.toLowerCase().includes('attention');

  let tag: string | undefined = undefined;
  if (isReserved) tag = 'Reserved';
  else if (isAttention) tag = 'Needs Attention';

  return {
    id: docId,
    studentId: `s-${studentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    studentName,
    grade: gradeLevel,
    subject: (raw.subject as string) || 'Math',
    topic: (raw.note as string) || (raw.subject as string) || 'Math Session',
    date: dateStr,
    time: time.length === 4 ? `0${time}` : time,
    displayTime,
    durationMinutes: Number(raw.duration) || 60,
    notes: (raw.note as string) || '',
    isCompleted: Boolean(raw.completed),
    tag,
    alarmEnabled: true,
    alarmTone: 'chime',
    alarmNoticeMinutes: 10,
  };
}

// Subscribe to real-time sessions for a specific weekStart (e.g. "2026-11-02")
export function subscribeToWeekSessions(
  weekStart: string,
  mondayDate: Date,
  onSuccess: (sessions: LessonSession[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const { db, authPromise } = getFirebaseInstance();

  let unsubscribe: Unsubscribe = () => {};

  (authPromise || Promise.resolve()).then(() => {
    if (!db) return;
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('weekStart', '==', weekStart));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const sessions = snapshot.docs.map((docSnap) =>
            mapFirestoreDocToSession(docSnap.id, docSnap.data(), mondayDate)
          );
          onSuccess(sessions);
        },
        (error) => {
          console.error('Firestore onSnapshot error:', error);
          onError(error);
        }
      );
    } catch (e) {
      console.error('Subscribe setup error:', e);
      onError(e as Error);
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

// Fetch all sessions across all weeks once to populate all student profiles
export async function fetchAllStudentsFromFirestore(): Promise<Student[]> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) return [];

  try {
    const sessionsRef = collection(db, 'sessions');
    const snapshot = await getDocs(sessionsRef);

    const studentMap = new Map<
      string,
      {
        name: string;
        grade: GradeLevel;
        sessionsCount: number;
        days: Set<string>;
        subjects: Set<string>;
      }
    >();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rawName = (data.student as string) || '';
      const cleanName = rawName.trim();
      if (!cleanName) return;

      const gradeDigits = String(data.grade || '').replace(/[^0-9]/g, '');
      const parsedGrade = parseInt(gradeDigits, 10);
      const grade: GradeLevel =
        parsedGrade >= 1 && parsedGrade <= 12 ? (parsedGrade as GradeLevel) : 7;

      const existing = studentMap.get(cleanName);
      if (existing) {
        existing.sessionsCount += 1;
        if (data.day) existing.days.add(data.day as string);
        if (data.subject) existing.subjects.add(data.subject as string);
      } else {
        studentMap.set(cleanName, {
          name: cleanName,
          grade,
          sessionsCount: 1,
          days: new Set(data.day ? [data.day as string] : []),
          subjects: new Set(data.subject ? [data.subject as string] : ['Math']),
        });
      }
    });

    const colors = [
      'bg-[#fff0f2] text-[#be185d]',
      'bg-blue-50 text-blue-700',
      'bg-purple-50 text-purple-700',
      'bg-emerald-50 text-emerald-700',
      'bg-amber-50 text-amber-700',
      'bg-teal-50 text-teal-700',
      'bg-indigo-50 text-indigo-700',
    ];

    const students: Student[] = Array.from(studentMap.values()).map((s, idx) => {
      const dayList = Array.from(s.days).slice(0, 3).join(', ');
      return {
        id: `s-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: s.name,
        grade: s.grade,
        sessionsPerWeek: s.sessionsCount > 1 ? s.days.size || 2 : 1,
        scheduleSummary: dayList ? `${dayList} (Weekly)` : 'Scheduled Session',
        isVerified: !s.name.toLowerCase().includes('reserved'),
        avatarColor: colors[idx % colors.length],
        notes: `Registered student in tutor-schedule-90593. Total lessons: ${s.sessionsCount}`,
      };
    });

    // Sort students alphabetically
    return students.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn('Error fetching all students from Firestore:', err);
    return [];
  }
}

// Toggle session completed status in live Firestore
export async function toggleSessionCompletedInLive(
  docId: string,
  newCompleted: boolean
): Promise<void> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) return;
  const docRef = doc(db, 'sessions', docId);
  await updateDoc(docRef, { completed: newCompleted });
}

// Add a new session directly to tutor-schedule-90593 Firestore
export async function addSessionToLive(
  session: Partial<LessonSession>,
  weekStart: string,
  dayName: string
): Promise<string> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) throw new Error('Firestore not initialized');

  const sessionsRef = collection(db, 'sessions');
  const data = {
    student: session.studentName || 'Student',
    day: dayName,
    time: session.time || '09:00',
    grade: `Grade ${session.grade || 7}`,
    subject: session.subject || 'Math',
    note: session.topic || session.notes || '',
    completed: Boolean(session.isCompleted),
    duration: session.durationMinutes || 60,
    weekStart,
  };

  const docRef = await addDoc(sessionsRef, data);
  return docRef.id;
}

// Update existing session in tutor-schedule-90593 Firestore
export async function updateSessionInLive(
  docId: string,
  session: Partial<LessonSession>,
  dayName: string
): Promise<void> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'sessions', docId);
  await updateDoc(docRef, {
    student: session.studentName,
    day: dayName,
    time: session.time,
    grade: `Grade ${session.grade || 7}`,
    subject: session.subject || 'Math',
    note: session.topic || session.notes || '',
    completed: Boolean(session.isCompleted),
    duration: session.durationMinutes || 60,
  });
}

// Delete session in live Firestore
export async function deleteSessionInLive(docId: string): Promise<void> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'sessions', docId);
  await deleteDoc(docRef);
}
