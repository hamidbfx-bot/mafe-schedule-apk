import React, { useState, useEffect } from 'react';
import { AlarmTone, GradeLevel, LessonSession, Student } from '../types';
import { strings } from '../utils/translations';
import { playTone } from '../utils/audioAlarm';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Partial<LessonSession>) => void;
  onDelete?: (sessionId: string) => void;
  editingSession?: LessonSession | null;
  students: Student[];
  onOpenNewStudentModal: () => void;
  defaultDate?: string;
  defaultNoticeMinutes?: number;
}

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingSession,
  students,
  onOpenNewStudentModal,
  defaultDate = '2026-11-02',
  defaultNoticeMinutes = 15,
}) => {
  const [studentName, setStudentName] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [hours, setHours] = useState('09');
  const [minutes, setMinutes] = useState('00');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [grade, setGrade] = useState<GradeLevel>(7);
  const [subject, setSubject] = useState('Math');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [alarmTone, setAlarmTone] = useState<AlarmTone>('chime');
  const [tag, setTag] = useState('');

  // Populate state when modal opens or editingSession changes
  useEffect(() => {
    if (editingSession) {
      setStudentName(editingSession.studentName);
      setSelectedStudentId(editingSession.studentId || '');
      setGrade(editingSession.grade);
      setSubject(editingSession.subject || 'Math');
      setTopic(editingSession.topic || '');
      setDate(editingSession.date);
      setNotes(editingSession.notes || '');
      setIsCompleted(editingSession.isCompleted);
      setAlarmTone(editingSession.alarmTone || 'chime');
      setTag(editingSession.tag || '');

      // Parse HH:MM into 12h format
      const [hStr, mStr] = editingSession.time.split(':');
      let hNum = parseInt(hStr || '9', 10);
      const isPm = hNum >= 12;
      if (hNum > 12) hNum -= 12;
      if (hNum === 0) hNum = 12;
      setHours(String(hNum).padStart(2, '0'));
      setMinutes(mStr || '00');
      setAmpm(isPm ? 'PM' : 'AM');
    } else {
      setStudentName('');
      setSelectedStudentId('');
      setHours('09');
      setMinutes('00');
      setAmpm('AM');
      setGrade(7);
      setSubject('Math');
      setTopic('');
      setDate(defaultDate);
      setNotes('');
      setIsCompleted(false);
      setAlarmTone('chime');
      setTag('');
    }
  }, [editingSession, isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleSelectStudentChip = (s: Student) => {
    setStudentName(s.name);
    setSelectedStudentId(s.id);
    setGrade(s.grade);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert('Please enter a student name');
      return;
    }

    // Convert 12h to 24h string
    let hNum = parseInt(hours, 10);
    if (isNaN(hNum)) hNum = 9;
    if (ampm === 'PM' && hNum < 12) hNum += 12;
    if (ampm === 'AM' && hNum === 12) hNum = 0;
    const time24 = `${String(hNum).padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    const displayTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')} ${ampm}`;

    onSave({
      id: editingSession ? editingSession.id : `sess-${Date.now()}`,
      studentId: selectedStudentId || `s-custom-${Date.now()}`,
      studentName: studentName.trim(),
      grade,
      subject: subject.trim() || 'Math',
      topic: topic.trim() || notes.trim() || 'Tutoring Session',
      date,
      time: time24,
      displayTime,
      durationMinutes: 60,
      notes: notes.trim(),
      isCompleted,
      tag: tag || undefined,
      alarmEnabled: true,
      alarmTone,
      alarmNoticeMinutes: defaultNoticeMinutes,
    });
  };

  const handlePreviewTone = (tone: AlarmTone) => {
    setAlarmTone(tone);
    playTone(tone, 0.7);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md bg-[#fff8f7] text-[#1f1a1c] min-h-screen sm:min-h-0 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto border border-[#ffd8e1]">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#ffd8e1]/40 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#fff0f2] text-[#be185d] hover:bg-[#ffe2e8] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <span className="font-bold text-lg text-[#be185d]">
              {editingSession ? strings.editLessonSlot : strings.newLessonSlot}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 p-5 space-y-4">
          <section className="bg-white rounded-2xl p-5 shadow-2xs border border-[#ffd8e1]/60 space-y-5">
            {/* 1. Student Name (Free Input + New Student Support) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9d224b] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">person</span>
                {strings.studentName}
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={strings.typeStudentName}
                  required
                  className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#be185d]"
                />
                <button
                  type="button"
                  onClick={onOpenNewStudentModal}
                  title="Add new student"
                  className="absolute right-3 top-3 text-[#be185d] hover:scale-110 transition-transform cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                </button>
              </div>

              {/* Student quick chips from live database */}
              <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                <button
                  type="button"
                  onClick={onOpenNewStudentModal}
                  className="bg-[#be185d] text-white px-3 py-1 rounded-full font-bold whitespace-nowrap hover:bg-[#9d174d] cursor-pointer shrink-0"
                >
                  {strings.newStudent}
                </button>
                {students.slice(0, 8).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStudentChip(s)}
                    className={`px-3 py-1 rounded-full font-medium whitespace-nowrap border transition-colors cursor-pointer shrink-0 ${
                      studentName.toLowerCase() === s.name.toLowerCase()
                        ? 'bg-[#be185d] text-white border-[#be185d]'
                        : 'bg-[#fff0f2] text-[#be185d] border-[#ffd8e1] hover:bg-[#ffe2e8]'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Manual Custom Time Controls */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9d224b] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">schedule</span>
                {strings.customClassTime}
              </label>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 flex-1 justify-center">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={hours}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 2);
                      setHours(v);
                    }}
                    className="w-12 bg-transparent text-center font-extrabold text-lg text-gray-800 focus:outline-none"
                  />
                  <span className="font-bold text-[#be185d] text-lg mx-1">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 2);
                      setMinutes(v);
                    }}
                    className="w-12 bg-transparent text-center font-extrabold text-lg text-gray-800 focus:outline-none"
                  />
                </div>

                {/* AM / PM Selector */}
                <div className="flex bg-[#fff0f2] p-1 rounded-xl border border-[#ffd8e1]">
                  <button
                    type="button"
                    onClick={() => setAmpm('AM')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      ampm === 'AM'
                        ? 'bg-[#be185d] text-white shadow-2xs'
                        : 'text-[#9d224b] hover:bg-white/50'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmpm('PM')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      ampm === 'PM'
                        ? 'bg-[#be185d] text-white shadow-2xs'
                        : 'text-[#9d224b] hover:bg-white/50'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Date selection */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Date:</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-[#fff8f7] border border-[#ffd8e1] rounded-lg px-2.5 py-1 text-xs font-medium text-gray-800 focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Grade Level Selection (1 to 12) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9d224b] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">school</span>
                {strings.gradeLevel} (1 - 12)
              </label>

              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as GradeLevel[]).map((g) => {
                  const isSelected = grade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`py-2 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#be185d] text-white font-bold shadow-2xs scale-102'
                          : 'bg-[#fff0f2] text-[#9d224b] border border-[#ffd8e1] hover:bg-[#ffe2e8]'
                      }`}
                    >
                      Grade {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject, Topic & Tag */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9d224b] mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Math, Science..."
                    className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9d224b] mb-1">
                    Status Tag
                  </label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  >
                    <option value="">Standard Session</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Exam Prep">Exam Prep</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#9d224b] mb-1">
                  Topic / Lesson Notes
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Fractions, Geometry proofs, Algebra Module 3..."
                  className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Notes & Completed Checkbox */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9d224b] mb-2">
                {strings.noteOptional}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={strings.notePlaceholder}
                className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl p-3 text-xs focus:outline-none"
              />
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  className="w-4 h-4 accent-[#be185d] rounded"
                />
                <span>{strings.markCompleted}</span>
              </label>
            </div>

            {/* 5. Alarm Setup (rings before class, Manila time) */}
            <div className="p-3.5 bg-[#fff0f2]/60 rounded-xl border border-[#ffd8e1] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#be185d] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">alarm_on</span>
                  {strings.classAlarmNotice(defaultNoticeMinutes)}
                </span>
                <span className="text-[10px] font-bold bg-[#ffd8e1] text-[#9d224b] px-2 py-0.5 rounded-full">
                  {strings.active}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                {(['chime', 'radar', 'gentle-bell'] as const).map((toneKey) => {
                  const isSelected = alarmTone === toneKey;
                  const label =
                    toneKey === 'chime' ? strings.chime : toneKey === 'radar' ? strings.radar : strings.gentleBell;
                  return (
                    <button
                      key={toneKey}
                      type="button"
                      onClick={() => handlePreviewTone(toneKey)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-2 border-[#be185d] text-[#be185d] shadow-2xs'
                          : 'bg-white/70 border border-[#ffd8e1] text-gray-600 hover:bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-center text-sm font-bold text-[#9d224b] bg-[#fff0f2] rounded-xl border border-[#ffd8e1] hover:bg-[#ffe2e8] transition-colors cursor-pointer"
              >
                {strings.cancel}
              </button>
              <button
                type="submit"
                className="flex-[2] py-3 text-sm font-bold text-white bg-[#be185d] rounded-xl shadow-md hover:bg-[#9d224b] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                {editingSession ? strings.updateSession : strings.saveSession}
              </button>
            </div>

            {/* Delete button if editing */}
            {editingSession && onDelete && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(strings.confirmDelete)) {
                      onDelete(editingSession.id);
                      onClose();
                    }
                  }}
                  className="text-xs text-red-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  {strings.deleteSession}
                </button>
              </div>
            )}
          </section>
        </form>
      </div>
    </div>
  );
};
