import { LessonSession } from '../types';

/**
 * The whole app operates on Philippines / Manila time (Asia/Manila, UTC+8),
 * regardless of the device's own timezone. Manila has no daylight saving.
 */
export const APP_TIMEZONE = 'Asia/Manila';
export const MANILA_UTC_OFFSET_MINUTES = 8 * 60;

/** Current instant expressed as a Date whose *local* fields equal Manila wall-clock time. */
export function manilaNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + MANILA_UTC_OFFSET_MINUTES) * 60_000);
}

/** Parse 'YYYY-MM-DD' into a local Date at midnight (avoids the UTC-parse day shift). */
export function parseISODateAsLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** Absolute epoch ms of a session start, interpreted as Manila time (UTC+8). */
export function sessionEpochMs(session: Pick<LessonSession, 'date' | 'time'>): number {
  const t = session.time.length === 5 ? session.time : `0${session.time}`;
  return Date.parse(`${session.date}T${t}:00+08:00`);
}

export function manilaTodayISO(): string {
  const n = manilaNow();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatManilaClock(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatManilaTime(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms));
}

export function formatManilaDateTime(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms));
}

export function formatManilaDate(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(ms));
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export function countdownParts(totalSeconds: number): CountdownParts {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalSeconds: s,
  };
}

/** Upcoming (not completed, start in the future) sessions sorted soonest first. */
export function getUpcomingSessions(sessions: LessonSession[], nowMs = Date.now()): LessonSession[] {
  return sessions
    .filter((s) => !s.isCompleted && sessionEpochMs(s) > nowMs)
    .sort((a, b) => sessionEpochMs(a) - sessionEpochMs(b));
}

export function getNextUpcomingSession(
  sessions: LessonSession[],
  nowMs = Date.now()
): LessonSession | undefined {
  return getUpcomingSessions(sessions, nowMs)[0];
}
