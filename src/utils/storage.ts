import { Student, LessonSession, AppSettings } from '../types';

const STORAGE_KEYS = {
  SESSIONS: 'tutor_schedule_sessions_v1',
  STUDENTS: 'tutor_schedule_students_v1',
  SETTINGS: 'tutor_schedule_settings_v1',
};

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's-bianka',
    name: 'Bianka',
    grade: 7,
    phone: '+1 (555) 234-8901',
    email: 'bianka.parents@example.com',
    notes: 'Excels with visual geometry diagrams. Preparing for July term test.',
    sessionsPerWeek: 3,
    scheduleSummary: 'Tue, Thu, Fri @ 09:00',
    isVerified: true,
    avatarColor: 'bg-[#fff0f2] text-[#be185d]',
  },
  {
    id: 's-sean',
    name: 'Sean Dabu',
    grade: 7,
    phone: '+1 (555) 345-6712',
    email: 'sean.dabu@example.com',
    notes: 'Working on algebra polynomials and algebraic expressions.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Mon, Thu @ 10:00',
    isVerified: true,
    avatarColor: 'bg-blue-50 text-blue-700',
  },
  {
    id: 's-solina',
    name: 'Solina',
    grade: 8,
    phone: '+1 (555) 891-2345',
    email: 'solina.learns@example.com',
    notes: 'Strong analytical skills. Working through geometry two-column proofs.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Mon, Thu @ 11:00',
    isVerified: true,
    avatarColor: 'bg-purple-50 text-purple-700',
  },
  {
    id: 's-camila',
    name: 'Camila',
    grade: 7,
    phone: '+1 (555) 432-9087',
    email: 'camila.m@example.com',
    notes: 'Needs extra patience with factoring trinomials and square roots.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Thu, Sat @ 13:00',
    isVerified: false,
    avatarColor: 'bg-amber-50 text-amber-700',
  },
  {
    id: 's-sophia',
    name: 'Sophia Nguyen',
    grade: 6,
    phone: '+1 (555) 912-4433',
    email: 'sophia.ng@example.com',
    notes: 'Honor student. Focusing on advanced fraction arithmetic.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Mon, Thu @ 14:30',
    isVerified: true,
    avatarColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 's-haizel',
    name: 'Haizel',
    grade: 5,
    phone: '+1 (555) 678-1234',
    email: 'haizel.f@example.com',
    notes: 'Practicing multiplication tables and word problems.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Wed, Sat @ 15:30',
    isVerified: true,
    avatarColor: 'bg-pink-50 text-pink-700',
  },
  {
    id: 's-advith',
    name: 'Advith',
    grade: 9,
    phone: '+1 (555) 789-5678',
    email: 'advith.stem@example.com',
    notes: 'Physics kinematics & high school algebra honors prep.',
    sessionsPerWeek: 3,
    scheduleSummary: 'Tue, Thu, Fri @ 16:00',
    isVerified: true,
    avatarColor: 'bg-teal-50 text-teal-700',
  },
  {
    id: 's-liam',
    name: 'Liam Chen',
    grade: 10,
    phone: '+1 (555) 543-9812',
    email: 'liam.chen@example.com',
    notes: 'Chemistry stoichiometry and balancing chemical equations.',
    sessionsPerWeek: 1,
    scheduleSummary: 'Wed @ 17:00',
    isVerified: true,
    avatarColor: 'bg-indigo-50 text-indigo-700',
  },
  {
    id: 's-maya',
    name: 'Maya Patel',
    grade: 4,
    phone: '+1 (555) 222-3344',
    email: 'patel.maya@example.com',
    notes: 'Elementary division with remainders & reading comprehension.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Mon, Fri @ 11:30',
    isVerified: true,
    avatarColor: 'bg-rose-50 text-rose-700',
  },
  {
    id: 's-david',
    name: 'David Miller',
    grade: 11,
    phone: '+1 (555) 888-9900',
    email: 'david.m@example.com',
    notes: 'Calculus derivatives and limits for AP test.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Sat, Sun @ 10:00',
    isVerified: false,
    avatarColor: 'bg-sky-50 text-sky-700',
  },
  {
    id: 's-emily',
    name: 'Emily Watson',
    grade: 8,
    phone: '+1 (555) 333-7766',
    email: 'emily.w@example.com',
    notes: 'Creative writing essays and syntax.',
    sessionsPerWeek: 1,
    scheduleSummary: 'Fri @ 14:00',
    isVerified: true,
    avatarColor: 'bg-violet-50 text-violet-700',
  },
  {
    id: 's-lucas',
    name: 'Lucas Garcia',
    grade: 7,
    phone: '+1 (555) 444-1122',
    email: 'lucas.g@example.com',
    notes: 'Cell biology and cell organelles.',
    sessionsPerWeek: 2,
    scheduleSummary: 'Thu, Sat @ 15:00',
    isVerified: false,
    avatarColor: 'bg-cyan-50 text-cyan-700',
  },
];

export const INITIAL_SESSIONS: LessonSession[] = [
  {
    id: 'sess-1',
    studentId: 's-bianka',
    studentName: 'Bianka',
    grade: 7,
    subject: 'Math',
    topic: 'Area & perimeter review',
    date: '2026-07-09',
    time: '09:00',
    displayTime: '09:00 AM',
    durationMinutes: 50,
    notes: 'Review composite shapes and circle formulas before quiz.',
    isCompleted: false,
    alarmEnabled: true,
    alarmTone: 'chime',
    alarmNoticeMinutes: 10,
  },
  {
    id: 'sess-2',
    studentId: 's-sean',
    studentName: 'Sean Dabu',
    grade: 7,
    subject: 'Math',
    topic: 'Algebra Module 3',
    date: '2026-07-09',
    time: '10:00',
    displayTime: '10:00 AM',
    durationMinutes: 50,
    notes: 'Distributive law and combining like terms.',
    isCompleted: false,
    alarmEnabled: true,
    alarmTone: 'radar',
    alarmNoticeMinutes: 10,
  },
  {
    id: 'sess-3',
    studentId: 's-solina',
    studentName: 'Solina',
    grade: 8,
    subject: 'Math',
    topic: 'Geometry proofs',
    date: '2026-07-09',
    time: '11:00',
    displayTime: '11:00 AM',
    durationMinutes: 60,
    notes: 'Congruent triangles SAS, ASA, SSS postulation theorem.',
    isCompleted: false,
    alarmEnabled: true,
    alarmTone: 'gentle-bell',
    alarmNoticeMinutes: 10,
  },
  {
    id: 'sess-4',
    studentId: 's-camila',
    studentName: 'Camila',
    grade: 7,
    subject: 'Math',
    topic: 'Quadratic equations',
    date: '2026-07-09',
    time: '13:00',
    displayTime: '01:00 PM',
    durationMinutes: 50,
    notes: 'Needs Attention: slow step-by-step factoring guidance.',
    isCompleted: false,
    tag: 'Needs Attention',
    alarmEnabled: true,
    alarmTone: 'chime',
    alarmNoticeMinutes: 10,
  },
  {
    id: 'sess-5',
    studentId: 's-sophia',
    studentName: 'Sophia Nguyen',
    grade: 6,
    subject: 'Math',
    topic: 'Decimals & Percentage word problems',
    date: '2026-07-09',
    time: '14:30',
    displayTime: '02:30 PM',
    durationMinutes: 45,
    notes: 'Excellent progress in previous session.',
    isCompleted: false,
    alarmEnabled: true,
    alarmTone: 'chime',
    alarmNoticeMinutes: 10,
  },
  {
    id: 'sess-6',
    studentId: 's-advith',
    studentName: 'Advith',
    grade: 9,
    subject: 'Math & Physics',
    topic: 'Kinematics velocity-time graphs',
    date: '2026-07-09',
    time: '16:00',
    displayTime: '04:00 PM',
    durationMinutes: 60,
    notes: 'Advanced problem sets from chapter 4.',
    isCompleted: false,
    alarmEnabled: true,
    alarmTone: 'radar',
    alarmNoticeMinutes: 10,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  wakeLockOverride: true,
  alarmTone: 'chime',
  alarmVolume: 0.8,
  alarmDurationSeconds: 30, // 30 seconds default
  autoDismissAfterMinutes: 10,
  vibrateEnabled: true,
  editPassword: '121402',
};

export function loadStoredStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return INITIAL_STUDENTS;
}

export function saveStoredStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch {
    // ignore
  }
}

export function loadStoredSessions(): LessonSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return INITIAL_SESSIONS;
}

export function saveStoredSessions(sessions: LessonSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

export function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
