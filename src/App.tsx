import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveAlarmState,
  AppSettings,
  LessonSession,
  Student,
  SyncMeta,
} from './types';
import {
  DEFAULT_SETTINGS,
  loadStoredSessions,
  loadStoredSettings,
  loadStoredStudents,
  loadSyncMeta,
  saveStoredSessions,
  saveStoredSettings,
  saveStoredStudents,
  saveSyncMeta,
  markSyncSchema,
  shouldSyncToday,
} from './utils/storage';
import {
  playTone,
  releaseWakeLock,
  requestWakeLock,
  startLoopingAlarm,
  stopLoopingAlarm,
} from './utils/audioAlarm';
import {
  getMondayOfWeek,
  formatDateISO,
  formatMonthHeader,
  fetchAllSessionsOnce,
  deriveStudentsFromSessions,
  toggleSessionCompletedInLive,
  addSessionToLive,
  updateSessionInLive,
  deleteSessionInLive,
  DAY_NAMES,
} from './services/firebaseSync';
import {
  manilaTodayISO,
  parseISODateAsLocal,
  sessionEpochMs,
  getNextUpcomingSession,
} from './utils/timezone';
import {
  scheduleSessionAlarms,
  setupNotificationListeners,
  isNativeApp,
} from './services/nativeNotifications';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { NextClassView } from './components/NextClassView';
import { ScheduleView } from './components/ScheduleView';
import { AlarmsView } from './components/AlarmsView';
import { StudentsView } from './components/StudentsView';
import { SettingsView } from './components/SettingsView';
import { AddSessionModal } from './components/AddSessionModal';
import { NewStudentModal } from './components/NewStudentModal';
import { MessageModal } from './components/MessageModal';
import { strings } from './utils/translations';

export default function App() {
  // Monday of the current week in MANILA time
  const [mondayDate, setMondayDate] = useState<Date>(() => getMondayOfWeek(new Date()));
  const currentWeekStart = formatDateISO(mondayDate);

  const [selectedDate, setSelectedDate] = useState<string>(() => manilaTodayISO());

  const [sessions, setSessions] = useState<LessonSession[]>(() => loadStoredSessions());
  const [students, setStudents] = useState<Student[]>(() => loadStoredStudents());
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(() => loadSyncMeta());

  const [currentTab, setCurrentTab] = useState<NavTab>('next');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active alarm state — driven by the next upcoming session in Manila time
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmState>({
    isRinging: false,
    session: undefined,
    remainingSeconds: 0,
    soundPlaying: false,
  });
  const dismissedAlarmIds = useRef<Set<string>>(new Set());
  const ringingSessionId = useRef<string | null>(null);
  const isTestAlarm = useRef(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LessonSession | null>(null);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<Student | null>(null);

  // Persist to localStorage (offline cache)
  useEffect(() => {
    saveStoredSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveStoredStudents(students);
  }, [students]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  // Screen wake lock while the app is open
  useEffect(() => {
    if (settings.wakeLockOverride) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [settings.wakeLockOverride]);

  // ---------------------------------------------------------------
  // Once-daily Firebase sync (Manila calendar day) to respect quotas.
  // Reads happen only: on first launch of the day, or manual "Sync now".
  // Writes (add/edit/delete) still go to Firestore immediately.
  // ---------------------------------------------------------------
  const syncFromCloud = useCallback(async (force: boolean) => {
    if (!force && !shouldSyncToday()) return;
    setIsSyncing(true);
    try {
      const cloudSessions = await fetchAllSessionsOnce();
      setSessions(cloudSessions);
      setStudents(deriveStudentsFromSessions(cloudSessions));
      const meta: SyncMeta = { lastSyncAt: Date.now(), lastSyncDate: manilaTodayISO() };
      saveSyncMeta(meta);
      markSyncSchema();
      setSyncMeta(meta);
      setIsLiveConnected(true);
    } catch (err) {
      console.warn('Daily sync failed, using cached data:', err);
      setIsLiveConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync on launch (only if not already synced today, Manila time)
  useEffect(() => {
    syncFromCloud(false);
  }, [syncFromCloud]);

  // Re-check when the app returns to the foreground (new Manila day → sync),
  // and every 30 minutes while it stays open (covers crossing midnight).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromCloud(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => syncFromCloud(false), 30 * 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [syncFromCloud]);

  const handleSyncNow = useCallback(() => {
    syncFromCloud(true);
  }, [syncFromCloud]);

  // ---------------------------------------------------------------
  // Native (Android) local notifications: re-schedule whenever the
  // sessions or the notice setting change. These fire even if the
  // app is fully closed, using Manila-time absolute timestamps.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!isNativeApp()) return;
    const t = window.setTimeout(() => {
      scheduleSessionAlarms(sessions, settings).catch((e) =>
        console.warn('Scheduling native alarms failed:', e)
      );
    }, 800);
    return () => window.clearTimeout(t);
  }, [sessions, settings.defaultAlarmNoticeMinutes, settings.alarmTone]);

  // Open the Next Class tab when a notification is tapped
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    setupNotificationListeners(() => setCurrentTab('next')).then((h) => {
      handle = h;
    });
    return () => {
      if (handle) handle.remove();
    };
  }, []);

  // ---------------------------------------------------------------
  // In-app alarm engine (while the app is open):
  // every second, find the next session; ring when inside the notice
  // window (default 15 min before class, Manila time).
  // ---------------------------------------------------------------
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [soundRemainingSeconds, setSoundRemainingSeconds] = useState(30);

  const startRinging = useCallback(
    (session: LessonSession) => {
      const duration = settings.alarmDurationSeconds || 30;
      setIsSoundPlaying(true);
      setSoundRemainingSeconds(duration);
      startLoopingAlarm(
        session.alarmTone || settings.alarmTone,
        settings.alarmVolume,
        duration,
        (sec) => setSoundRemainingSeconds(sec),
        () => setIsSoundPlaying(false)
      );
      if (settings.vibrateEnabled && navigator.vibrate) {
        navigator.vibrate([400, 200, 400, 200, 400]);
      }
    },
    [settings.alarmTone, settings.alarmVolume, settings.alarmDurationSeconds, settings.vibrateEnabled]
  );

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const next = getNextUpcomingSession(sessions, now);
      if (!next) {
        setActiveAlarm((prev) =>
          prev.session && !prev.isRinging
            ? { ...prev, session: undefined, remainingSeconds: 0 }
            : prev.isRinging
            ? prev
            : { ...prev, session: undefined, remainingSeconds: 0 }
        );
        return;
      }
      const remaining = Math.max(0, Math.floor((sessionEpochMs(next) - now) / 1000));
      const noticeSec = (next.alarmNoticeMinutes || settings.defaultAlarmNoticeMinutes || 15) * 60;
      const shouldRing =
        remaining <= noticeSec && remaining > 0 && !dismissedAlarmIds.current.has(next.id);

      if (shouldRing && ringingSessionId.current !== next.id) {
        ringingSessionId.current = next.id;
        isTestAlarm.current = false;
        startRinging(next);
      }

      setActiveAlarm((prev) => ({
        ...prev,
        session: prev.isRinging && prev.session ? prev.session : next,
        remainingSeconds:
          prev.isRinging && prev.session ? prev.remainingSeconds : remaining,
        isRinging: prev.isRinging || shouldRing,
        soundPlaying: isSoundPlaying,
      }));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [sessions, settings.defaultAlarmNoticeMinutes, startRinging, isSoundPlaying]);

  // Countdown for the ringing alarm banner
  useEffect(() => {
    if (!activeAlarm.isRinging) return;
    const t = window.setInterval(() => {
      setActiveAlarm((prev) => ({
        ...prev,
        remainingSeconds: Math.max(0, prev.remainingSeconds - 1),
      }));
    }, 1000);
    return () => window.clearInterval(t);
  }, [activeAlarm.isRinging]);

  // Week navigation (Manila-based)
  const handlePrevWeek = () => {
    const prev = new Date(mondayDate);
    prev.setDate(prev.getDate() - 7);
    setMondayDate(prev);
    setSelectedDate(formatDateISO(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(mondayDate);
    next.setDate(next.getDate() + 7);
    setMondayDate(next);
    setSelectedDate(formatDateISO(next));
  };

  const handleCurrentWeek = () => {
    setMondayDate(getMondayOfWeek(new Date()));
    setSelectedDate(manilaTodayISO());
  };

  const handleStopSound = useCallback(() => {
    stopLoopingAlarm();
    setIsSoundPlaying(false);
    setSoundRemainingSeconds(settings.alarmDurationSeconds || 30);
  }, [settings.alarmDurationSeconds]);

  const handleDismissAlarm = () => {
    handleStopSound();
    // Only suppress the real alarm on dismiss — a test alarm must not
    // disable the actual reminder for that class.
    if (activeAlarm.session && !isTestAlarm.current) {
      dismissedAlarmIds.current.add(activeAlarm.session.id);
    }
    isTestAlarm.current = false;
    ringingSessionId.current = null;
    setActiveAlarm((prev) => ({ ...prev, isRinging: false, soundPlaying: false }));
  };

  const handleSnoozeAlarm = () => {
    handleStopSound();
    const snoozedId = activeAlarm.session?.id;
    const wasTest = isTestAlarm.current;
    isTestAlarm.current = false;
    ringingSessionId.current = null;
    setActiveAlarm((prev) => ({ ...prev, isRinging: false, soundPlaying: false }));
    // Re-arm after 5 minutes (real alarms only)
    if (snoozedId && !wasTest) {
      dismissedAlarmIds.current.add(snoozedId);
      window.setTimeout(() => {
        dismissedAlarmIds.current.delete(snoozedId);
      }, 5 * 60_000);
    }
  };

  const handleTriggerTestAlarm = (session?: LessonSession) => {
    const target = session || getNextUpcomingSession(sessions) || sessions[0];
    const duration = settings.alarmDurationSeconds || 30;
    isTestAlarm.current = true;
    ringingSessionId.current = null;
    setActiveAlarm({
      isRinging: true,
      session: target,
      remainingSeconds: target
        ? Math.max(0, Math.floor((sessionEpochMs(target) - Date.now()) / 1000))
        : 600,
      soundPlaying: true,
    });
    setIsSoundPlaying(true);
    setSoundRemainingSeconds(duration);
    startLoopingAlarm(
      target?.alarmTone || settings.alarmTone,
      settings.alarmVolume,
      duration,
      (sec) => setSoundRemainingSeconds(sec),
      () => setIsSoundPlaying(false)
    );
  };

  const handleTestSound = () => {
    if (isSoundPlaying) {
      handleStopSound();
    } else {
      const duration = settings.alarmDurationSeconds || 30;
      setIsSoundPlaying(true);
      setSoundRemainingSeconds(duration);
      startLoopingAlarm(
        settings.alarmTone,
        settings.alarmVolume,
        duration,
        (sec) => setSoundRemainingSeconds(sec),
        () => setIsSoundPlaying(false)
      );
    }
  };

  // Session handlers — writes go to Firestore immediately (reads are limited, not writes)
  const handleSaveSession = async (newOrUpdated: Partial<LessonSession>) => {
    try {
      const targetDate = parseISODateAsLocal(newOrUpdated.date || selectedDate);
      const dayIdx = (targetDate.getDay() + 6) % 7;
      const dayName = DAY_NAMES[dayIdx] || 'Monday';
      const weekStart = formatDateISO(getMondayOfWeek(targetDate));

      if (
        editingSession &&
        newOrUpdated.id === editingSession.id &&
        !editingSession.id.startsWith('sess-')
      ) {
        setSessions((prev) =>
          prev.map((s) => (s.id === newOrUpdated.id ? ({ ...s, ...newOrUpdated } as LessonSession) : s))
        );
        if (newOrUpdated.id && !newOrUpdated.id.startsWith('sess-')) {
          await updateSessionInLive(newOrUpdated.id, newOrUpdated, dayName, weekStart);
        }
      } else {
        const docId = await addSessionToLive(newOrUpdated, weekStart, dayName);
        const completeSession: LessonSession = { ...newOrUpdated, id: docId } as LessonSession;
        setSessions((prev) => [completeSession, ...prev]);
      }
    } catch (err) {
      console.warn('Error saving session to live database:', err);
      // Keep the local copy so it still works offline
      if (!editingSession) {
        setSessions((prev) => [newOrUpdated as LessonSession, ...prev]);
      }
    } finally {
      setIsAddModalOpen(false);
      setEditingSession(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (!sessionId.startsWith('sess-')) await deleteSessionInLive(sessionId);
    } catch (err) {
      console.warn('Error deleting from live database:', err);
    }
  };

  const handleToggleComplete = async (session: LessonSession) => {
    const updated = !session.isCompleted;
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, isCompleted: updated } : s))
    );
    try {
      if (!session.id.startsWith('sess-')) await toggleSessionCompletedInLive(session.id, updated);
    } catch (err) {
      console.warn('Error updating complete status in live database:', err);
    }
  };

  const handleEditSession = (session: LessonSession) => {
    setEditingSession(session);
    setIsAddModalOpen(true);
  };

  const handleOpenAddModal = (presetDate?: string) => {
    setEditingSession(null);
    if (presetDate) setSelectedDate(presetDate);
    setIsAddModalOpen(true);
  };

  const handleQuickSetAlarm = (student: Student) => {
    setEditingSession({
      id: `sess-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      subject: 'Math',
      topic: 'Personal Tutoring Lesson',
      date: selectedDate,
      time: '09:00',
      displayTime: '09:00 AM',
      durationMinutes: 60,
      isCompleted: false,
      alarmEnabled: true,
      alarmTone: settings.alarmTone,
      alarmNoticeMinutes: settings.defaultAlarmNoticeMinutes || 15,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveNewStudent = (student: Student) => {
    setStudents((prev) => [student, ...prev]);
  };

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleResetData = () => {
    if (window.confirm('Reset cached settings and re-sync from tutor-schedule-90593?')) {
      stopLoopingAlarm();
      setSettings(DEFAULT_SETTINGS);
      syncFromCloud(true);
    }
  };

  const handleImportData = (data: { students: Student[]; sessions: LessonSession[] }) => {
    setStudents(data.students);
    setSessions(data.sessions);
  };

  const monthHeader = formatMonthHeader(parseISODateAsLocal(selectedDate));

  return (
    <div className="flex justify-center min-h-screen p-0 sm:p-4 bg-[#fff8f7] selection:bg-[#ffd8e1]">
      <div className="w-full max-w-md bg-[#fff8f7] text-[#1f1a1c] min-h-screen flex flex-col shadow-xl sm:rounded-3xl overflow-hidden pb-20 relative border border-[#ffd8e1]/40">
        <Header
          currentMonth={monthHeader}
          onMonthClick={handleCurrentWeek}
          onNotificationClick={() => setCurrentTab('alarms')}
          onProfileClick={() => setCurrentTab('settings')}
          activeAlarmCount={activeAlarm.isRinging ? 1 : 0}
          isLiveConnected={isLiveConnected}
          isSyncing={isSyncing}
        />

        {/* Floating alert bar when the alarm is ringing on another tab */}
        {activeAlarm.isRinging && currentTab !== 'alarms' && (
          <div
            onClick={() => setCurrentTab('alarms')}
            className="bg-gradient-to-r from-[#be185d] to-[#9d174d] text-white px-4 py-2.5 flex items-center justify-between shadow-md cursor-pointer text-xs font-bold animate-pulse sticky top-[65px] z-10"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base animate-bounce">alarm</span>
              <span>
                {activeAlarm.session?.studentName || 'Tutoring Alert'} •{' '}
                {Math.floor(activeAlarm.remainingSeconds / 60)}:
                {String(activeAlarm.remainingSeconds % 60).padStart(2, '0')} {strings.remaining}
              </span>
            </div>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              {strings.alarms} →
            </span>
          </div>
        )}

        <main className="flex-1 flex flex-col">
          {currentTab === 'next' && (
            <NextClassView
              sessions={sessions}
              settings={settings}
              syncMeta={syncMeta}
              isSyncing={isSyncing}
              onSyncNow={handleSyncNow}
              onOpenSchedule={() => setCurrentTab('schedule')}
              onTriggerAlarmForSession={handleTriggerTestAlarm}
            />
          )}

          {currentTab === 'schedule' && (
            <ScheduleView
              sessions={sessions.filter((s) => s.weekStart === currentWeekStart)}
              mondayDate={mondayDate}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onCurrentWeek={handleCurrentWeek}
              onOpenAddModal={handleOpenAddModal}
              onEditSession={handleEditSession}
              onToggleComplete={handleToggleComplete}
              onTriggerAlarmForSession={handleTriggerTestAlarm}
              isSyncing={isSyncing}
            />
          )}

          {currentTab === 'alarms' && (
            <AlarmsView
              activeAlarm={activeAlarm}
              onDismissAlarm={handleDismissAlarm}
              onSnoozeAlarm={handleSnoozeAlarm}
              onTriggerTestAlarm={() => handleTriggerTestAlarm()}
              sessions={sessions}
              settings={settings}
              onToggleWakeLock={() =>
                handleUpdateSettings({ wakeLockOverride: !settings.wakeLockOverride })
              }
              onToneChange={(tone) => {
                handleUpdateSettings({ alarmTone: tone });
                playTone(tone, settings.alarmVolume);
              }}
              onTestSound={handleTestSound}
              isSoundPlaying={isSoundPlaying}
              soundRemainingSeconds={soundRemainingSeconds}
            />
          )}

          {currentTab === 'students' && (
            <StudentsView
              students={students}
              onOpenMessage={(student) => setSelectedStudentForMessage(student)}
              onQuickSetAlarm={handleQuickSetAlarm}
              onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetData={handleResetData}
              students={students}
              sessions={sessions}
              onImportData={handleImportData}
              isLiveConnected={isLiveConnected}
              onRefreshLive={handleSyncNow}
              syncMeta={syncMeta}
              isSyncing={isSyncing}
            />
          )}
        </main>

        <Navigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          alarmActive={activeAlarm.isRinging}
        />

        <AddSessionModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingSession(null);
          }}
          onSave={handleSaveSession}
          onDelete={handleDeleteSession}
          editingSession={editingSession}
          students={students}
          onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
          defaultDate={selectedDate}
          defaultNoticeMinutes={settings.defaultAlarmNoticeMinutes || 15}
        />

        <NewStudentModal
          isOpen={isNewStudentModalOpen}
          onClose={() => setIsNewStudentModalOpen(false)}
          onSave={handleSaveNewStudent}
        />

        <MessageModal
          isOpen={!!selectedStudentForMessage}
          onClose={() => setSelectedStudentForMessage(null)}
          student={selectedStudentForMessage}
        />
      </div>
    </div>
  );
}
