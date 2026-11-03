import React from 'react';
import { LessonSession } from '../types';
import { strings } from '../utils/translations';
import { getWeekDates, formatWeekLabel } from '../services/firebaseSync';

interface ScheduleViewProps {
  sessions: LessonSession[];
  mondayDate: Date;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onOpenAddModal: (presetDate?: string) => void;
  onEditSession: (session: LessonSession) => void;
  onToggleComplete: (session: LessonSession) => void;
  onTriggerAlarmForSession: (session: LessonSession) => void;
  isSyncing: boolean;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  sessions,
  mondayDate,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onOpenAddModal,
  onEditSession,
  onToggleComplete,
  onTriggerAlarmForSession,
  isSyncing,
}) => {
  // Dynamically compute the 7 days of the active week
  const weekDays = getWeekDates(mondayDate);
  const weekLabel = formatWeekLabel(mondayDate);

  // Filter sessions for selected date, sorted by time
  const daySessions = sessions
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="flex-1 p-4 space-y-4">
      {/* Title & Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#be185d]">{strings.tutorSchedule}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-500 font-medium">
              {sessions.length} sessions this week
            </span>
            {isSyncing && (
              <span className="text-[10px] text-amber-600 font-bold animate-pulse">
                • Syncing...
              </span>
            )}
          </div>
        </div>

        {/* Week navigation with Previous / Label / Next */}
        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-[#ffd8e1] text-xs font-bold text-[#9d224b] shadow-2xs">
          <button
            type="button"
            onClick={onPrevWeek}
            className="material-symbols-outlined text-base hover:text-[#be185d] cursor-pointer"
            title="Previous Week"
          >
            chevron_left
          </button>
          <button
            type="button"
            onClick={onCurrentWeek}
            className="hover:underline cursor-pointer px-1"
            title="Go to Today / Current Week"
          >
            {weekLabel}
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="material-symbols-outlined text-base hover:text-[#be185d] cursor-pointer"
            title="Next Week"
          >
            chevron_right
          </button>
        </div>
      </div>

      {/* Day Selector Strip */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 scrollbar-none">
        {weekDays.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          const count = sessions.filter((s) => s.date === day.dateStr).length;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDate(day.dateStr)}
              className={`flex flex-col items-center py-2 px-3 rounded-2xl min-w-[50px] transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-[#be185d] text-white shadow-md scale-102 ring-2 ring-[#be185d]/30'
                  : 'bg-white border border-[#ffd8e1] text-gray-800 hover:border-[#be185d]/40'
              }`}
            >
              <span
                className={`text-[10px] uppercase font-semibold ${
                  isSelected ? 'text-pink-200' : 'text-gray-500'
                }`}
              >
                {day.shortName}
              </span>
              <span className={`text-sm ${isSelected ? 'font-black' : 'font-extrabold'}`}>
                {day.dayNumber}
              </span>

              {count > 0 && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? 'bg-pink-200' : 'bg-[#be185d]'
                  }`}
                  title={`${count} sessions`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule Timeline Slots */}
      <div className="space-y-3 pt-2">
        {daySessions.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-[#ffd8e1] text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#fff0f2] text-[#be185d] mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">event_busy</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">No lessons scheduled for this day</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sessions from tutor-schedule-90593.web.app sync once a day (Manila time). Tap "Sync now" on the Next tab for an instant refresh.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAddModal(selectedDate)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#be185d] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#9d224b] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              {strings.newLessonSlot}
            </button>
          </div>
        ) : (
          daySessions.map((session) => {
            const isAttention = session.tag === 'Needs Attention';
            const isReserved = session.tag === 'Reserved';
            const borderAccent = isAttention
              ? 'border-l-amber-500'
              : isReserved
              ? 'border-l-indigo-500'
              : 'border-l-[#be185d]';

            return (
              <div key={session.id} className="flex items-center gap-3 group">
                {/* Time Display */}
                <div className="w-12 text-right">
                  <span className="text-xs font-bold text-gray-600 block leading-tight">
                    {session.time}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 block">
                    {session.durationMinutes}m
                  </span>
                </div>

                {/* Card Container */}
                <div
                  className={`flex-1 bg-white rounded-2xl p-3.5 border-l-4 ${borderAccent} border border-[#ffd8e1]/60 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-2`}
                >
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => onEditSession(session)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-sm text-gray-900 truncate ${
                          session.isCompleted ? 'line-through text-gray-400' : ''
                        }`}
                      >
                        {session.studentName}
                      </span>

                      {isAttention ? (
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          {session.tag}
                        </span>
                      ) : isReserved ? (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          Reserved
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#fff0f2] text-[#be185d] font-bold px-2 py-0.5 rounded-full border border-[#ffd8e1]">
                          Grade {session.grade}
                        </span>
                      )}

                      {session.isCompleted && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ {strings.completedTag}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      <span className="font-semibold text-gray-700">{session.subject}</span>
                      {` • ${session.gradeLabel || `Grade ${session.grade}`}`}
                    </p>

                    {session.notes && (
                      <p className="text-[11px] text-gray-400 italic mt-0.5 line-clamp-2">
                        {session.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions & Alarm Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Alarm button */}
                    <button
                      type="button"
                      onClick={() => onTriggerAlarmForSession(session)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        session.time === '09:00' && !session.isCompleted
                          ? 'text-[#be185d] bg-[#fff0f2] border border-[#ffd8e1] hover:bg-[#ffe2e8]'
                          : 'text-[#be185d] hover:bg-pink-50'
                      }`}
                      title="Trigger Alarm Reminder"
                    >
                      <span className="material-symbols-outlined text-lg">alarm</span>
                    </button>

                    {/* Completion Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleComplete(session)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                        session.isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 hover:border-[#be185d] text-transparent hover:text-gray-300'
                      }`}
                      title={session.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Button */}
      <button
        type="button"
        onClick={() => onOpenAddModal(selectedDate)}
        aria-label="Add Lesson Session"
        className="fixed sm:absolute bottom-20 right-5 w-14 h-14 bg-[#be185d] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 cursor-pointer hover:bg-[#9d174d]"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
};
