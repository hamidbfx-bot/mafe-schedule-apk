import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveAlarmState,
  AppSettings,
  LessonSession,
  Student,
} from './types';
import {
  DEFAULT_SETTINGS,
  loadStoredSessions,
  loadStoredSettings,
  loadStoredStudents,
  saveStoredSessions,
  saveStoredSettings,
  saveStoredStudents,
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
  subscribeToWeekSessions,
  fetchAllStudentsFromFirestore,
  toggleSessionCompletedInLive,
  addSessionToLive,
  updateSessionInLive,
  deleteSessionInLive,
  DAY_NAMES,
} from './services/firebaseSync';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { ScheduleView } from './components/ScheduleView';
import { AlarmsView } from './components/AlarmsView';
import { StudentsView } from './components/StudentsView';
import { SettingsView } from './components/SettingsView';
import { AddSessionModal } from './components/AddSessionModal';
import { NewStudentModal } from './components/NewStudentModal';
import { MessageModal } from './components/MessageModal';
import { strings } from './utils/translations';

export default function App() {
  // Real-world Monday of the current week (e.g. 2026-11-02)
  const [mondayDate, setMondayDate] = useState<Date>(() => getMondayOfWeek(new Date()));
  const currentWeekStart = formatDateISO(mondayDate);

  // Selected date defaults to today or Monday of the week
  const todayISO = formatDateISO(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // If today is within this week, select today, otherwise select Monday
    return todayISO;
  });

  const [sessions, setSessions] = useState<LessonSession[]>(() => loadStoredSessions());
  const [students, setStudents] = useState<Student[]>(() => loadStoredStudents());
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());

  const [currentTab, setCurrentTab] = useState<NavTab>('schedule');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Active alarm state (Pre-armed or dynamic from upcoming session)
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmState>({
    isRinging: true,
    session: undefined,
    remainingSeconds: 577, // 09 mins 37 secs
    soundPlaying: false,
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LessonSession | null>(null);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<Student | null>(null);

  // Sync to localStorage
  useEffect(() => {
    saveStoredSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveStoredStudents(students);
  }, [students]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  // Handle Screen Wake Lock
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

  // Real-time synchronization with tutor-schedule-90593.web.app Firestore
  useEffect(() => {
    setIsSyncing(true);
    const unsubscribe = subscribeToWeekSessions(
      currentWeekStart,
      mondayDate,
      (liveSessions) => {
        setSessions(liveSessions);
        setIsLiveConnected(true);
        setIsSyncing(false);

        // Update active alarm session if available
        if (liveSessions.length > 0) {
          setActiveAlarm((prev) => ({
            ...prev,
            session: prev.session || liveSessions[0],
          }));
        }
      },
      (err) => {
        console.warn('Real-time sync error, using cached data:', err);
        setIsSyncing(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentWeekStart, mondayDate]);

  // Fetch all students from Firestore on mount to populate Students directory
  const loadAllStudents = useCallback(async () => {
    try {
      const liveStudents = await fetchAllStudentsFromFirestore();
      if (liveStudents.length > 0) {
        setStudents(liveStudents);
      }
    } catch (e) {
      console.warn('Could not load all students from live database:', e);
    }
  }, []);

  useEffect(() => {
    loadAllStudents();
  }, [loadAllStudents]);

  // Countdown timer for active alarm
  const countdownTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeAlarm.isRinging && activeAlarm.remainingSeconds > 0) {
      countdownTimerRef.current = window.setInterval(() => {
        setActiveAlarm((prev) => {
          if (prev.remainingSeconds <= 1) {
            return { ...prev, remainingSeconds: 0 };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }

    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [activeAlarm.isRinging, activeAlarm.remainingSeconds]);

  // Week navigation controls
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
    const mon = getMondayOfWeek(new Date());
    setMondayDate(mon);
    setSelectedDate(formatDateISO(new Date()));
  };

  // 30-second alarm sound state
  const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);
  const [soundRemainingSeconds, setSoundRemainingSeconds] = useState<number>(30);

  const handleStopSound = useCallback(() => {
    stopLoopingAlarm();
    setIsSoundPlaying(false);
    setSoundRemainingSeconds(settings.alarmDurationSeconds || 30);
  }, [settings.alarmDurationSeconds]);

  // Alarm controls
  const handleDismissAlarm = () => {
    handleStopSound();
    setActiveAlarm((prev) => ({
      ...prev,
      isRinging: false,
      soundPlaying: false,
    }));
  };

  const handleSnoozeAlarm = () => {
    handleStopSound();
    setActiveAlarm((prev) => ({
      ...prev,
      remainingSeconds: prev.remainingSeconds + 300, // +5 min
      soundPlaying: false,
    }));
  };

  const handleTriggerTestAlarm = (session?: LessonSession) => {
    const target = session || sessions[0];
    const tone = target?.alarmTone || settings.alarmTone;
    const duration = settings.alarmDurationSeconds || 30;

    setActiveAlarm({
      isRinging: true,
      session: target,
      remainingSeconds: 600, // 10 minutes warning
      soundPlaying: true,
    });

    setIsSoundPlaying(true);
    setSoundRemainingSeconds(duration);

    startLoopingAlarm(
      tone,
      settings.alarmVolume,
      duration,
      (sec) => setSoundRemainingSeconds(sec),
      () => {
        setIsSoundPlaying(false);
      }
    );
  };

  const handleTestSound = () => {
    if (isSoundPlaying) {
      handleStopSound();
    } else {
      const tone = settings.alarmTone;
      const duration = settings.alarmDurationSeconds || 30;
      setIsSoundPlaying(true);
      setSoundRemainingSeconds(duration);

      startLoopingAlarm(
        tone,
        settings.alarmVolume,
        duration,
        (sec) => setSoundRemainingSeconds(sec),
        () => {
          setIsSoundPlaying(false);
        }
      );
    }
  };

  // Session Handlers with Live Firebase persistence
  const handleSaveSession = async (newOrUpdated: Partial<LessonSession>) => {
    try {
      // Determine dayName from session date
      const targetDate = new Date(newOrUpdated.date || selectedDate);
      const dayIdx = (targetDate.getDay() + 6) % 7; // Monday = 0
      const dayName = DAY_NAMES[dayIdx] || 'Monday';

      if (editingSession) {
        // Optimistic UI update
        setSessions((prev) =>
          prev.map((s) => (s.id === newOrUpdated.id ? ({ ...s, ...newOrUpdated } as LessonSession) : s))
        );

        // Update in live Firestore
        if (newOrUpdated.id && !newOrUpdated.id.startsWith('sess-local')) {
          await updateSessionInLive(newOrUpdated.id, newOrUpdated, dayName);
        }
      } else {
        // Add to live Firestore
        const docId = await addSessionToLive(newOrUpdated, currentWeekStart, dayName);
        const completeSession: LessonSession = {
          ...newOrUpdated,
          id: docId,
        } as LessonSession;
        setSessions((prev) => [completeSession, ...prev]);
      }
    } catch (err) {
      console.warn('Error saving session to live database:', err);
    } finally {
      setIsAddModalOpen(false);
      setEditingSession(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await deleteSessionInLive(sessionId);
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
      await toggleSessionCompletedInLive(session.id, updated);
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
      alarmNoticeMinutes: 10,
    });
    setIsAddModalOpen(true);
  };

  // Student Handlers
  const handleSaveNewStudent = (student: Student) => {
    setStudents((prev) => [student, ...prev]);
  };

  // Settings Handlers
  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleResetData = () => {
    if (window.confirm('Reset all cached settings and reload from tutor-schedule-90593?')) {
      stopLoopingAlarm();
      setSettings(DEFAULT_SETTINGS);
      loadAllStudents();
    }
  };

  const handleImportData = (data: { students: Student[]; sessions: LessonSession[] }) => {
    setStudents(data.students);
    setSessions(data.sessions);
  };

  const monthHeader = formatMonthHeader(new Date(selectedDate));

  return (
    <div className="flex justify-center min-h-screen p-0 sm:p-4 bg-[#fff8f7] selection:bg-[#ffd8e1]">
      <div className="w-full max-w-md bg-[#fff8f7] text-[#1f1a1c] min-h-screen flex flex-col shadow-xl sm:rounded-3xl overflow-hidden pb-20 relative border border-[#ffd8e1]/40">
        {/* Top Header */}
        <Header
          currentMonth={monthHeader}
          onMonthClick={handleCurrentWeek}
          onNotificationClick={() => setCurrentTab('alarms')}
          onProfileClick={() => setCurrentTab('settings')}
          activeAlarmCount={activeAlarm.isRinging ? 1 : 0}
          isLiveConnected={isLiveConnected}
          isSyncing={isSyncing}
        />

        {/* Global Floating Mini Alert Bar if alarm is ringing and user is on another tab */}
        {activeAlarm.isRinging && currentTab !== 'alarms' && (
          <div
            onClick={() => setCurrentTab('alarms')}
            className="bg-gradient-to-r from-[#be185d] to-[#9d174d] text-white px-4 py-2.5 flex items-center justify-between shadow-md cursor-pointer text-xs font-bold animate-pulse sticky top-[65px] z-10"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base animate-bounce">alarm</span>
              <span>
                {activeAlarm.session?.studentName || 'Tutoring Alert'} • {strings.inMinutes(10)} (
                {Math.floor(activeAlarm.remainingSeconds / 60)}:
                {String(activeAlarm.remainingSeconds % 60).padStart(2, '0')})
              </span>
            </div>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              {strings.alarms} →
            </span>
          </div>
        )}

        {/* Main Content Area based on currentTab */}
        <main className="flex-1 flex flex-col">
          {currentTab === 'schedule' && (
            <ScheduleView
              sessions={sessions}
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
              onRefreshLive={() => {
                loadAllStudents();
                handleCurrentWeek();
              }}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <Navigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          alarmActive={activeAlarm.isRinging}
        />

        {/* Add / Edit Session Modal */}
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
        />

        {/* New Student Modal */}
        <NewStudentModal
          isOpen={isNewStudentModalOpen}
          onClose={() => setIsNewStudentModalOpen(false)}
          onSave={handleSaveNewStudent}
        />

        {/* Message Student Modal */}
        <MessageModal
          isOpen={!!selectedStudentForMessage}
          onClose={() => setSelectedStudentForMessage(null)}
          student={selectedStudentForMessage}
        />
      </div>
    </div>
  );
}
