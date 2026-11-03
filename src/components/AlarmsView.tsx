import React from 'react';
import { ActiveAlarmState, AppSettings, LessonSession } from '../types';
import { strings } from '../utils/translations';
import { formatManilaTime, getUpcomingSessions, sessionEpochMs } from '../utils/timezone';

interface AlarmsViewProps {
  activeAlarm: ActiveAlarmState;
  onDismissAlarm: () => void;
  onSnoozeAlarm: () => void;
  onTriggerTestAlarm: () => void;
  sessions: LessonSession[];
  settings: AppSettings;
  onToggleWakeLock: () => void;
  onToneChange: (tone: 'chime' | 'radar' | 'gentle-bell') => void;
  onTestSound: () => void;
  isSoundPlaying: boolean;
  soundRemainingSeconds: number;
}

export const AlarmsView: React.FC<AlarmsViewProps> = ({
  activeAlarm,
  onDismissAlarm,
  onSnoozeAlarm,
  onTriggerTestAlarm,
  sessions,
  settings,
  onToggleWakeLock,
  onToneChange,
  onTestSound,
  isSoundPlaying,
  soundRemainingSeconds,
}) => {
  // Format seconds into "MM mins SS secs"
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const padM = String(mins).padStart(2, '0');
    const padS = String(secs).padStart(2, '0');
    return `${padM} mins ${padS} secs ${strings.remaining}`;
  };

  // Target current session or fallback to the next upcoming one (Manila time)
  const upcoming = getUpcomingSessions(sessions);
  const targetSession = activeAlarm.session || upcoming[0] || sessions[0];
  const ringDuration = settings.alarmDurationSeconds || 30;

  return (
    <div className="flex-1 p-4 space-y-4">
      {/* ACTIVE RINGER BANNER (10m Warning - Requires Manual Dismissal) */}
      <section
        className={`bg-gradient-to-br from-[#be185d] to-[#9d174d] text-white rounded-3xl p-5 shadow-lg space-y-4 transition-all duration-300 relative overflow-hidden ${
          activeAlarm.isRinging || isSoundPlaying
            ? 'ring-4 ring-pink-400/50 shadow-pink-900/30'
            : 'opacity-95'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-pink-200">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeAlarm.isRinging || isSoundPlaying ? 'bg-red-400 animate-ping' : 'bg-pink-300'
              }`}
            />
            <span>{strings.activeRingerBanner}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTestSound}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                isSoundPlaying
                  ? 'bg-amber-400 text-gray-900 shadow-xs animate-pulse'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-xs">
                {isSoundPlaying ? 'stop_circle' : 'volume_up'}
              </span>
              {isSoundPlaying ? `Stop (${soundRemainingSeconds}s)` : strings.fullSound}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0 ${
              activeAlarm.isRinging || isSoundPlaying ? 'animate-bounce' : ''
            }`}
          >
            <span className="material-symbols-outlined text-3xl">alarm</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black truncate">
                {targetSession ? targetSession.studentName : 'Bianka'}
              </h2>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                Grade {targetSession ? targetSession.grade : 7}
              </span>
            </div>
            <p className="text-xs text-pink-100 mt-0.5 truncate">
              {targetSession ? targetSession.subject : 'Math'} Session starting at{' '}
              <strong>
                {targetSession ? formatManilaTime(sessionEpochMs(targetSession)) : '09:00 AM'}
              </strong>{' '}
              (Manila)
            </p>
            <p className="text-xs text-yellow-300 font-extrabold flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>{formatCountdown(activeAlarm.remainingSeconds)}</span>
            </p>

            {isSoundPlaying && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-black text-amber-200">
                <span className="material-symbols-outlined text-sm animate-spin">graphic_eq</span>
                <span>Ringing loud for {soundRemainingSeconds}s...</span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Dismiss & Snooze Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onDismissAlarm}
            className="py-3 bg-white text-[#be185d] font-extrabold rounded-xl shadow-xs text-sm flex items-center justify-center gap-2 hover:bg-pink-50 active:scale-98 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">alarm_off</span>
            {strings.dismissTurnOff}
          </button>
          <button
            type="button"
            onClick={onSnoozeAlarm}
            className="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 border border-white/30 active:scale-98 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">snooze</span>
            {strings.snooze5Min}
          </button>
        </div>

        {!activeAlarm.isRinging && !isSoundPlaying && (
          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={onTriggerTestAlarm}
              className="text-[11px] font-bold text-pink-200 underline hover:text-white cursor-pointer"
            >
              🔔 {strings.testAlarmNow} ({ringDuration}s)
            </button>
          </div>
        )}
      </section>

      {/* Persistent Wake Override */}
      <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#ffd8e1] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#fff0f2] text-[#be185d] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">graphic_eq</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{strings.persistentWakeOverride}</p>
            <p className="text-[10px] text-gray-500">{strings.wakeOverrideDesc}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleWakeLock}
          aria-label={strings.persistentWakeOverride}
          className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 flex items-center ${
            settings.wakeLockOverride ? 'bg-[#be185d] justify-end' : 'bg-gray-200 justify-start'
          }`}
        >
          <div className="w-4 h-4 bg-white rounded-full shadow-2xs" />
        </button>
      </div>

      {/* Sound Selection Bar with 30s preview */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#ffd8e1] shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-[#be185d]">music_note</span>
            <span className="text-xs font-bold text-gray-800">{strings.soundTone}</span>
            <span className="text-[10px] font-extrabold bg-[#fff0f2] text-[#be185d] px-2 py-0.5 rounded-full border border-[#ffd8e1]">
              {ringDuration}s Duration
            </span>
          </div>

          <button
            type="button"
            onClick={onTestSound}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              isSoundPlaying
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'text-[#be185d] hover:bg-[#fff0f2]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isSoundPlaying ? 'stop' : 'play_circle'}
            </span>
            {isSoundPlaying ? `Stop (${soundRemainingSeconds}s)` : `Play (${ringDuration}s)`}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {(['chime', 'radar', 'gentle-bell'] as const).map((toneKey) => {
            const isSelected = settings.alarmTone === toneKey;
            const label =
              toneKey === 'chime'
                ? strings.chime
                : toneKey === 'radar'
                ? strings.radar
                : strings.gentleBell;

            return (
              <button
                key={toneKey}
                type="button"
                onClick={() => onToneChange(toneKey)}
                className={`py-2 px-1 rounded-xl text-center font-bold transition-all cursor-pointer truncate ${
                  isSelected
                    ? 'bg-[#fff0f2] border-2 border-[#be185d] text-[#be185d] shadow-2xs'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming Sessions List */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-[#9d224b] uppercase tracking-wider">
          {strings.upcomingSessionsAlarms}
        </h3>

        {/* Upcoming sessions sorted by Manila-time start */}
        {(upcoming.length > 0 ? upcoming : sessions).slice(0, 5).map((session, index) => {
          const isFirst = index === 0;
          const noticeMin = session.alarmNoticeMinutes || settings.defaultAlarmNoticeMinutes || 15;
          return (
            <div
              key={session.id}
              className={`bg-white rounded-2xl p-4 border-l-4 ${
                isFirst ? 'border-l-[#be185d]' : 'border-l-gray-300'
              } border border-[#ffd8e1] space-y-3 shadow-2xs`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-gray-900">
                    {session.studentName}{' '}
                    <span className="text-xs bg-[#fff0f2] text-[#be185d] font-semibold px-2 py-0.5 rounded-full ml-1">
                      Grade {session.grade}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    {session.subject} • {session.topic || 'Tutoring Practice'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#be185d]">
                    {formatManilaTime(sessionEpochMs(session))}
                  </span>
                  <p className="text-[10px] text-pink-600 font-bold">{session.date}</p>
                </div>
              </div>

              <div className="bg-[#fff8f7] rounded-xl p-2.5 text-xs space-y-2 border border-[#ffd8e1]/60">
                <div className="flex items-center justify-between text-gray-800 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-red-500 animate-pulse">
                      alarm
                    </span>{' '}
                    {strings.alarmBeforeClass(noticeMin)} •{' '}
                    {formatManilaTime(sessionEpochMs(session) - noticeMin * 60_000)}
                  </span>
                  <span className="text-red-600 text-[11px] bg-red-100 px-2 py-0.5 rounded-full font-bold">
                    {isFirst && (activeAlarm.isRinging || isSoundPlaying)
                      ? strings.sounding
                      : strings.armed}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  {strings.classNotificationsDesc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
