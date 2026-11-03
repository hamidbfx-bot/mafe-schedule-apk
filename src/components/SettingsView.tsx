import React, { useState } from 'react';
import { AlarmTone, AppSettings, LessonSession, Student, SyncMeta } from '../types';
import { strings } from '../utils/translations';
import { playTone } from '../utils/audioAlarm';
import { SITE_EDIT_PASSWORD } from '../services/firebaseSync';
import {
  isNativeApp,
  ensureNotificationSetup,
  sendTestNotification,
} from '../services/nativeNotifications';
import { formatManilaDate, formatManilaTime } from '../utils/timezone';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetData: () => void;
  students: Student[];
  sessions: LessonSession[];
  onImportData: (data: { students: Student[]; sessions: LessonSession[] }) => void;
  isLiveConnected: boolean;
  onRefreshLive: () => void;
  syncMeta: SyncMeta | null;
  isSyncing: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  students,
  sessions,
  onImportData,
  isLiveConnected,
  onRefreshLive,
  syncMeta,
  isSyncing,
}) => {
  const [password, setPassword] = useState(settings.editPassword || SITE_EDIT_PASSWORD);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [notifState, setNotifState] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [testSent, setTestSent] = useState(false);

  const handleEnableNotifications = async () => {
    const ok = await ensureNotificationSetup(true);
    setNotifState(ok ? 'granted' : 'denied');
  };

  const handleTestNotification = async () => {
    const ok = await sendTestNotification();
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 6000);
    } else {
      setNotifState('denied');
    }
  };

  const handleTestTone = (tone: AlarmTone) => {
    playTone(tone, settings.alarmVolume);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ editPassword: password.trim() });
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2000);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      source: 'https://tutor-schedule-90593.web.app',
      exportedAt: new Date().toISOString(),
      students,
      sessions,
      settings,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutor-schedule-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.students) && Array.isArray(parsed.sessions)) {
          onImportData({ students: parsed.students, sessions: parsed.sessions });
          alert('Data successfully imported!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 p-4 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-[#be185d]">{strings.settings}</h1>
        <p className="text-xs text-gray-500 font-medium">
          Tutor Schedule preferences &amp; live database
        </p>
      </div>

      {/* Live Firestore Connection Status */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9d224b] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">cloud</span>
            Live Website Sync
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isLiveConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {isLiveConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        <div className="bg-[#fff8f7] rounded-xl p-3 text-xs space-y-1.5 border border-[#ffd8e1]/60">
          <p className="text-gray-700 font-medium">
            <strong className="text-gray-900">Source:</strong>{' '}
            <a
              href="https://tutor-schedule-90593.web.app/"
              target="_blank"
              rel="noreferrer"
              className="text-[#be185d] underline font-bold"
            >
              tutor-schedule-90593.web.app
            </a>
          </p>
          <p className="text-gray-600 text-[11px]">{strings.dailySyncDesc}</p>
          <p className="text-gray-600 text-[11px] font-medium">
            {strings.lastSync}:{' '}
            {syncMeta
              ? `${formatManilaDate(syncMeta.lastSyncAt)} • ${formatManilaTime(syncMeta.lastSyncAt)}`
              : strings.neverSynced}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshLive}
          disabled={isSyncing}
          className="w-full py-2 bg-[#fff0f2] text-[#be185d] text-xs font-bold rounded-xl border border-[#ffd8e1] hover:bg-[#ffe2e8] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>
            sync
          </span>
          {isSyncing ? strings.syncing : strings.syncNow}
        </button>
      </div>

      {/* Class Notifications (native Android) */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9d224b] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">notifications_active</span>
          {strings.classNotifications}
        </span>
        <p className="text-[11px] text-gray-500">{strings.classNotificationsDesc}</p>

        {isNativeApp() ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className={`w-full py-2 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                notifState === 'granted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-[#be185d] text-white border-[#be185d] hover:bg-[#9d224b]'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {notifState === 'granted' ? 'check_circle' : 'notifications'}
              </span>
              {notifState === 'granted' ? strings.notificationsEnabled : strings.enableNotifications}
            </button>
            <button
              type="button"
              onClick={handleTestNotification}
              className="w-full py-2 bg-[#fff0f2] text-[#be185d] text-xs font-bold rounded-xl border border-[#ffd8e1] hover:bg-[#ffe2e8] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">alarm_on</span>
              {testSent ? strings.testNotificationSent : strings.testNotification}
            </button>
            {notifState === 'denied' && (
              <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                {strings.notificationsDenied}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            {strings.webOnlyNote}
          </p>
        )}

        {/* Default notice minutes */}
        <div className="space-y-1.5 pt-1 border-t border-[#ffd8e1]/40">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">{strings.defaultNoticeMinutes}</label>
            <span className="text-[10px] bg-[#ffd8e1] text-[#be185d] font-black px-2 py-0.5 rounded-full">
              {settings.defaultAlarmNoticeMinutes || 15} min
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[10, 15, 20, 30].map((min) => {
              const isSelected = (settings.defaultAlarmNoticeMinutes || 15) === min;
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => onUpdateSettings({ defaultAlarmNoticeMinutes: min })}
                  className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-[#be185d] text-white shadow-2xs'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {min}m {min === 15 ? '★' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Password for Site Integration */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-[#9d224b] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">lock</span>
          Website Edit Password
        </label>
        <p className="text-[11px] text-gray-500">
          The password required by tutor-schedule-90593 to save or delete sessions (default:{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">121402</code>).
        </p>
        <form onSubmit={handleSavePassword} className="flex gap-2">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#be185d] text-white text-xs font-bold rounded-xl hover:bg-[#9d174d] cursor-pointer"
          >
            {passwordSaved ? 'Saved!' : 'Save'}
          </button>
        </form>
      </div>

      {/* Alarm Sound Tone & Volume */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9d224b] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">volume_up</span>
            {strings.soundTone}
          </span>
          <span className="text-[11px] font-bold text-gray-500">
            {Math.round(settings.alarmVolume * 100)}%
          </span>
        </div>

        {/* Volume Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={settings.alarmVolume}
            onChange={(e) =>
              onUpdateSettings({ alarmVolume: parseFloat(e.target.value) })
            }
            className="w-full accent-[#be185d] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-bold">
            <span>Soft (10%)</span>
            <span>Balanced (50%)</span>
            <span>Loud (100%)</span>
          </div>
        </div>

        {/* Alarm Duration Selector */}
        <div className="space-y-1.5 pt-1 border-t border-[#ffd8e1]/40">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 block">
              Alarm Ring Duration
            </label>
            <span className="text-[10px] bg-[#ffd8e1] text-[#be185d] font-black px-2 py-0.5 rounded-full">
              {settings.alarmDurationSeconds || 30}s
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[15, 30, 45, 60].map((sec) => {
              const isSelected = (settings.alarmDurationSeconds || 30) === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateSettings({ alarmDurationSeconds: sec })}
                  className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-[#be185d] text-white shadow-2xs'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {sec}s {sec === 30 ? '★' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone Selection with test buttons */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-gray-700 block">Default Alarm Tone</label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(['chime', 'radar', 'gentle-bell'] as const).map((toneKey) => {
              const isSelected = settings.alarmTone === toneKey;
              const label =
                toneKey === 'chime' ? strings.chime : toneKey === 'radar' ? strings.radar : strings.gentleBell;
              return (
                <button
                  key={toneKey}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ alarmTone: toneKey });
                    handleTestTone(toneKey);
                  }}
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
      </div>

      {/* Screen Wake Lock Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#fff0f2] text-[#be185d] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">screen_lock_portrait</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{strings.persistentWakeOverride}</p>
            <p className="text-[10px] text-gray-500">{strings.wakeOverrideDesc}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onUpdateSettings({ wakeLockOverride: !settings.wakeLockOverride })
          }
          className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 flex items-center ${
            settings.wakeLockOverride ? 'bg-[#be185d] justify-end' : 'bg-gray-200 justify-start'
          }`}
        >
          <div className="w-4 h-4 bg-white rounded-full shadow-2xs" />
        </button>
      </div>

      {/* Data Management: Backup & Reset */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9d224b] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">cloud_sync</span>
          Backup &amp; Data
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={handleExportBackup}
            className="py-2.5 px-3 bg-[#fff0f2] text-[#be185d] rounded-xl border border-[#ffd8e1] hover:bg-[#ffe2e8] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">download</span>
            {strings.exportData}
          </button>

          <label className="py-2.5 px-3 bg-gray-50 text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-100 flex items-center justify-center gap-1.5 cursor-pointer text-center">
            <span className="material-symbols-outlined text-base">upload_file</span>
            {strings.importData}
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onResetData}
          className="w-full py-2.5 text-center text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-1"
        >
          <span className="material-symbols-outlined text-base">restart_alt</span>
          {strings.resetDemoData}
        </button>
      </div>

      {/* Footer Branding info */}
      <div className="text-center pt-2 text-xs text-gray-400 space-y-1">
        <p className="font-semibold">Tutor Schedule v1.0 • Connected to Live Cloud</p>
        <p className="text-[10px]">Synchronized with tutor-schedule-90593.web.app</p>
      </div>
    </div>
  );
};
