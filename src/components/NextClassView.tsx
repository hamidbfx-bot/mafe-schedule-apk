import React, { useEffect, useState } from 'react';
import { AppSettings, LessonSession, SyncMeta } from '../types';
import { strings } from '../utils/translations';
import {
  countdownParts,
  formatManilaClock,
  formatManilaDate,
  formatManilaTime,
  getUpcomingSessions,
  manilaTodayISO,
  sessionEpochMs,
} from '../utils/timezone';
import { isNativeApp } from '../services/nativeNotifications';

interface NextClassViewProps {
  sessions: LessonSession[];
  settings: AppSettings;
  syncMeta: SyncMeta | null;
  isSyncing: boolean;
  onSyncNow: () => void;
  onOpenSchedule: () => void;
  onTriggerAlarmForSession: (session: LessonSession) => void;
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-white/15 rounded-xl px-2 py-2 min-w-[52px] border border-white/20">
      <span className="text-2xl font-black tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-pink-100 mt-1 font-bold">{label}</span>
    </div>
  );
}

export const NextClassView: React.FC<NextClassViewProps> = ({
  sessions,
  settings,
  syncMeta,
  isSyncing,
  onSyncNow,
  onOpenSchedule,
  onTriggerAlarmForSession,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const upcoming = getUpcomingSessions(sessions, nowMs);
  const next = upcoming[0];
  const todayISO = manilaTodayISO();
  const todayRemaining = upcoming.filter((s) => s.date === todayISO);
  const noticeMinutes = next?.alarmNoticeMinutes || settings.defaultAlarmNoticeMinutes || 15;

  const remaining = next ? Math.max(0, Math.floor((sessionEpochMs(next) - nowMs) / 1000)) : 0;
  const parts = countdownParts(remaining);
  const withinNotice = next ? remaining <= noticeMinutes * 60 : false;

  return (
    <div className="flex-1 p-4 space-y-4">
      {/* Title + live Manila clock */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#be185d]">{strings.nextClass}</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">{strings.timesInManila}</p>
        </div>
        <div className="text-right bg-white rounded-2xl border border-[#ffd8e1] px-3 py-2 shadow-2xs">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
            {strings.manilaTime}
          </p>
          <p className="text-sm font-black text-[#be185d] tabular-nums">{formatManilaClock()}</p>
        </div>
      </div>

      {/* Next class hero card */}
      {next ? (
        <section className="bg-gradient-to-br from-[#be185d] to-[#9d174d] text-white rounded-3xl p-5 shadow-lg space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-pink-200">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">upcoming</span>
              {strings.yourNextClass}
            </span>
            {withinNotice && (
              <span className="flex items-center gap-1 bg-red-500/90 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                <span className="material-symbols-outlined text-xs">alarm</span>
                {strings.startingSoon}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black">{next.studentName}</h2>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                Grade {next.grade}
              </span>
            </div>
            <p className="text-sm text-pink-100 mt-1">
              {next.subject}
              {next.topic && next.topic !== next.subject ? ` • ${next.topic}` : ''}
            </p>
            <p className="text-xs text-pink-200 mt-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">event</span>
              {formatManilaDate(sessionEpochMs(next))} • {formatManilaTime(sessionEpochMs(next))}
            </p>
          </div>

          {/* Countdown */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-pink-200 font-bold mb-1.5">
              {strings.startsIn}
            </p>
            <div className="flex gap-2">
              {parts.days > 0 && <CountdownBox value={parts.days} label="days" />}
              <CountdownBox value={parts.hours} label="hrs" />
              <CountdownBox value={parts.minutes} label="min" />
              <CountdownBox value={parts.seconds} label="sec" />
            </div>
          </div>

          {/* Alarm info */}
          <div className="bg-white/10 rounded-xl p-3 text-xs flex items-center gap-2 border border-white/15">
            <span className="material-symbols-outlined text-lg text-amber-300">notifications_active</span>
            <span className="text-pink-50">
              {strings.alarmWillRingAt(
                formatManilaTime(sessionEpochMs(next) - noticeMinutes * 60_000),
                noticeMinutes
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenSchedule}
              className="py-2.5 bg-white text-[#be185d] font-extrabold rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-pink-50 active:scale-98 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">calendar_today</span>
              {strings.viewInSchedule}
            </button>
            <button
              type="button"
              onClick={() => onTriggerAlarmForSession(next)}
              className="py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 border border-white/30 active:scale-98 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">alarm</span>
              {strings.testSound}
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-3xl p-6 border border-[#ffd8e1] shadow-2xs text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#fff0f2] text-[#be185d] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">event_busy</span>
          </div>
          <h2 className="text-lg font-extrabold text-gray-800">{strings.noUpcomingClass}</h2>
          <p className="text-xs text-gray-500">{strings.noUpcomingClassDesc}</p>
          <button
            type="button"
            onClick={onOpenSchedule}
            className="mt-1 px-4 py-2 bg-[#be185d] text-white text-xs font-bold rounded-xl hover:bg-[#9d224b] cursor-pointer inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add</span>
            {strings.openSchedule}
          </button>
        </section>
      )}

      {/* Remaining today */}
      {todayRemaining.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-[#9d224b] uppercase tracking-wider">
            {strings.todayRemaining} ({todayRemaining.length})
          </h3>
          {todayRemaining.map((s) => (
            <SessionRow key={s.id} session={s} nowMs={nowMs} />
          ))}
        </div>
      )}

      {/* Coming up (next few) */}
      {upcoming.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-[#9d224b] uppercase tracking-wider">
            {strings.comingUp}
          </h3>
          {upcoming.slice(1, 6).map((s) => (
            <SessionRow key={s.id} session={s} nowMs={nowMs} />
          ))}
        </div>
      )}

      {/* Daily sync status */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9d224b] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">cloud_sync</span>
            {strings.dailySync}
          </span>
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#fff0f2] text-[#be185d] border border-[#ffd8e1] hover:bg-[#ffe2e8] disabled:opacity-50 cursor-pointer flex items-center gap-1"
          >
            <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            {isSyncing ? strings.syncing : strings.syncNow}
          </button>
        </div>
        <p className="text-[11px] text-gray-500">{strings.dailySyncDesc}</p>
        <p className="text-[11px] text-gray-600 font-medium">
          {strings.lastSync}:{' '}
          {syncMeta
            ? `${formatManilaDate(syncMeta.lastSyncAt)} • ${formatManilaTime(syncMeta.lastSyncAt)}`
            : strings.neverSynced}
        </p>
        {!isNativeApp() && (
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            {strings.webOnlyNote}
          </p>
        )}
      </div>
    </div>
  );
};

function SessionRow({ session, nowMs }: { session: LessonSession; nowMs: number }) {
  const start = sessionEpochMs(session);
  const mins = Math.max(0, Math.floor((start - nowMs) / 60000));
  const label =
    mins >= 1440
      ? `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
      : mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins}m`;
  return (
    <div className="bg-white rounded-2xl p-3 border border-[#ffd8e1] shadow-2xs flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">
          {session.studentName}
          <span className="text-[10px] bg-[#fff0f2] text-[#be185d] font-semibold px-1.5 py-0.5 rounded-full ml-1.5">
            Gr {session.grade}
          </span>
        </p>
        <p className="text-[11px] text-gray-500 truncate">
          {session.subject} • {formatManilaDate(start)}
        </p>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className="text-sm font-black text-[#be185d]">{formatManilaTime(start)}</p>
        <p className="text-[10px] text-gray-400 font-bold">in {label}</p>
      </div>
    </div>
  );
}
