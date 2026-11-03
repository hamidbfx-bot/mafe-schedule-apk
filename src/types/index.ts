export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type AlarmTone = 'chime' | 'radar' | 'gentle-bell';

export interface Student {
  id: string;
  name: string;
  grade: GradeLevel;
  phone?: string;
  email?: string;
  notes?: string;
  sessionsPerWeek?: number;
  scheduleSummary?: string;
  isVerified?: boolean;
  avatarColor?: string;
}

export interface LessonSession {
  id: string;
  studentId: string;
  studentName: string;
  grade: GradeLevel;
  subject: string;
  topic: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  displayTime: string; // e.g. "09:00 AM" or "09:00"
  durationMinutes: number;
  notes?: string;
  isCompleted: boolean;
  tag?: string; // "Needs Attention", "Exam Prep", etc.
  alarmEnabled: boolean;
  alarmTone: AlarmTone;
  alarmNoticeMinutes?: number; // minutes before class; falls back to settings default (15)
}

export interface ActiveAlarmState {
  isRinging: boolean;
  session?: LessonSession;
  remainingSeconds: number;
  soundPlaying: boolean;
  isSnoozed?: boolean;
}

export interface AppSettings {
  wakeLockOverride: boolean;
  alarmTone: AlarmTone;
  alarmVolume: number; // 0 to 1
  alarmDurationSeconds: number; // duration of ringing sound, default 30s
  autoDismissAfterMinutes: number;
  vibrateEnabled: boolean;
  editPassword?: string;
  defaultAlarmNoticeMinutes: number; // minutes before class to ring, default 15
}

export interface SyncMeta {
  lastSyncAt: number; // epoch ms
  lastSyncDate: string; // Manila YYYY-MM-DD of the last successful sync
}
