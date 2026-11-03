import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { LessonSession, Student, GradeLevel } from '../types';
import { parseISODateAsLocal } from '../utils/timezone';

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

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Convert any instant to a Date whose local Y/M/D fields equal the Manila calendar day. */
function toManilaWallDate(input: Date | string): Date {
  if (typeof input === 'string') return parseISODateAsLocal(input);
  const manila = new Date(input.getTime() + (input.getTimezoneOffset() + 8 * 60) * 60_000);
  return new Date(manila.getFullYear(), manila.getMonth(), manila.getDate());
}

/** Monday of the Manila-time week for any given instant / ISO date. */
export function getMondayOfWeek(dateInput: Date | string): Date {
  const d = toManilaWallDate(dateInput);
  const day = d.getDay(); // 0 Sunday .. 6 Saturday
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** YYYY-MM-DD from a Manila-wall Date (uses local fields, no timezone shift). */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatWeekLabel(mondayDate: Date): string {
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);
  const startMonth = MONTHS_SHORT[mondayDate.getMonth()];
  const startDay = String(mondayDate.getDate()).padStart(2, '0');
  const endMonth = MONTHS_SHORT[sundayDate.getMonth()];
  const endDay = String(sundayDate.getDate()).padStart(2, '0');
  if (startMonth === endMonth) return `${startMonth} ${startDay} - ${endDay}`;
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

export function formatMonthHeader(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function getWeekDates(mondayDate: Date) {
  return DAY_NAMES.map((name, index) => {
    const current = new Date(mondayDate);
    current.setDate(current.getDate() + index);
    return {
      dayName: name,
      shortName: name.slice(0, 3),
      dateStr: formatDateISO(current),
      dayNumber: String(current.getDate()).padStart(2, '0'),
      fullDate: current,
    };
  });
}

/** Map a Firestore doc to a LessonSession using the doc's own weekStart. */
export function mapFirestoreDocToSession(
  docId: string,
  raw: Record<string, unknown>,
  mondayDate?: Date
): LessonSession {
  const monday =
    mondayDate ||
    getMondayOfWeek(typeof raw.weekStart === 'string' ? (raw.weekStart as string) : new Date());

  const dayName = (raw.day as DayName) || 'Monday';
  const dayIndex = DAY_NAMES.indexOf(dayName);
  const sessionDate = new Date(monday);
  sessionDate.setDate(sessionDate.getDate() + (dayIndex >= 0 ? dayIndex : 0));
  const dateStr = formatDateISO(sessionDate);

  const rawGrade = String(raw.grade || 'Grade 7');
  const gradeDigits = rawGrade.replace(/[^0-9]/g, '');
  const parsedGrade = parseInt(gradeDigits, 10);
  const gradeLevel: GradeLevel =
    parsedGrade >= 1 && parsedGrade <= 12 ? (parsedGrade as GradeLevel) : 7;

  const time = (raw.time as string) || '09:00';
  const [hStr, mStr] = time.split(':');
  const hNum = parseInt(hStr || '9', 10);
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
    // No per-session notice from the website → use the app's default (15 min)
  };
}

/**
 * Read the entire sessions collection ONCE (no live listener).
 * Used by the once-daily sync to stay within Firebase read limits.
 */
export async function fetchAllSessionsOnce(): Promise<LessonSession[]> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'sessions'));
  return snapshot.docs.map((d) => mapFirestoreDocToSession(d.id, d.data()));
}

/** One-time read of a single week (kept for optional manual refresh). */
export async function fetchWeekSessionsOnce(weekStart: string): Promise<LessonSession[]> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) return [];
  const monday = getMondayOfWeek(weekStart);
  const q = query(collection(db, 'sessions'), where('weekStart', '==', weekStart));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapFirestoreDocToSession(d.id, d.data(), monday));
}

const AVATAR_COLORS = [
  'bg-[#fff0f2] text-[#be185d]',
  'bg-blue-50 text-blue-700',
  'bg-purple-50 text-purple-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-teal-50 text-teal-700',
  'bg-indigo-50 text-indigo-700',
];

/** Derive the student directory from already-fetched sessions (no extra reads). */
export function deriveStudentsFromSessions(sessions: LessonSession[]): Student[] {
  const studentMap = new Map<
    string,
    { name: string; grade: GradeLevel; count: number; days: Set<string>; subjects: Set<string> }
  >();

  for (const s of sessions) {
    const cleanName = s.studentName.trim();
    if (!cleanName) continue;
    // Key by the slug id so name variants ("Adrian Yirga" / "adrian yirga")
    // merge into one student instead of producing duplicate React keys.
    const slug = `s-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const dayName = DAY_NAMES[(parseISODateAsLocal(s.date).getDay() + 6) % 7];
    const existing = studentMap.get(slug);
    if (existing) {
      existing.count += 1;
      existing.days.add(dayName);
      existing.subjects.add(s.subject);
    } else {
      studentMap.set(slug, {
        name: cleanName,
        grade: s.grade,
        count: 1,
        days: new Set([dayName]),
        subjects: new Set([s.subject]),
      });
    }
  }

  return Array.from(studentMap.values())
    .map((s, idx) => {
      const dayList = Array.from(s.days).slice(0, 3).join(', ');
      return {
        id: `s-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: s.name,
        grade: s.grade,
        sessionsPerWeek: s.count > 1 ? s.days.size || 2 : 1,
        scheduleSummary: dayList ? `${dayList} (Weekly)` : 'Scheduled Session',
        isVerified: !s.name.toLowerCase().includes('reserved'),
        avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        notes: `Registered student in tutor-schedule-90593. Total lessons: ${s.count}`,
      } as Student;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Backwards-compatible helper: fetch all sessions then derive students. */
export async function fetchAllStudentsFromFirestore(): Promise<Student[]> {
  try {
    const sessions = await fetchAllSessionsOnce();
    return deriveStudentsFromSessions(sessions);
  } catch (err) {
    console.warn('Error fetching students from Firestore:', err);
    return [];
  }
}

export async function toggleSessionCompletedInLive(docId: string, newCompleted: boolean): Promise<void> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) return;
  await updateDoc(doc(db, 'sessions', docId), { completed: newCompleted });
}

export async function addSessionToLive(
  session: Partial<LessonSession>,
  weekStart: string,
  dayName: string
): Promise<string> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) throw new Error('Firestore not initialized');
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
  const docRef = await addDoc(collection(db, 'sessions'), data);
  return docRef.id;
}

export async function updateSessionInLive(
  docId: string,
  session: Partial<LessonSession>,
  dayName: string,
  weekStart?: string
): Promise<void> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) throw new Error('Firestore not initialized');
  await updateDoc(doc(db, 'sessions', docId), {
    student: session.studentName,
    day: dayName,
    time: session.time,
    grade: `Grade ${session.grade || 7}`,
    subject: session.subject || 'Math',
    note: session.topic || session.notes || '',
    completed: Boolean(session.isCompleted),
    duration: session.durationMinutes || 60,
    ...(weekStart ? { weekStart } : {}),
  });
}

export async function deleteSessionInLive(docId: string): Promise<void> {
  const { db, authPromise } = getFirebaseInstance();
  await (authPromise || Promise.resolve());
  if (!db) throw new Error('Firestore not initialized');
  await deleteDoc(doc(db, 'sessions', docId));
}
