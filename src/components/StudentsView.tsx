import React, { useState } from 'react';
import { Student } from '../types';
import { strings } from '../utils/translations';

interface StudentsViewProps {
  students: Student[];
  onOpenMessage: (student: Student) => void;
  onQuickSetAlarm: (student: Student) => void;
  onOpenNewStudentModal: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onOpenMessage,
  onQuickSetAlarm,
  onOpenNewStudentModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | '4-6' | '7-9' | '10-12'>('all');

  // Filter students
  const filteredStudents = students.filter((student) => {
    // Search query match
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      student.name.toLowerCase().includes(q) ||
      `grade ${student.grade}`.includes(q) ||
      (student.notes && student.notes.toLowerCase().includes(q));

    // Grade range filter match
    let matchesGrade = true;
    if (gradeFilter === '4-6') {
      matchesGrade = student.grade >= 4 && student.grade <= 6;
    } else if (gradeFilter === '7-9') {
      matchesGrade = student.grade >= 7 && student.grade <= 9;
    } else if (gradeFilter === '10-12') {
      matchesGrade = student.grade >= 10 && student.grade <= 12;
    }

    return matchesQuery && matchesGrade;
  });

  const getInitials = (name: string) => {
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (clean.slice(0, 2) || 'ST').toUpperCase();
  };

  return (
    <div className="flex-1 p-4 space-y-4">
      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={strings.searchPlaceholder}
              className="w-full bg-white border border-[#ffd8e1] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none shadow-2xs text-gray-800 placeholder-gray-400"
            />
            <span className="material-symbols-outlined text-gray-400 absolute left-3 top-2.5 text-lg">
              search
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenNewStudentModal}
            className="w-10 h-10 rounded-2xl bg-[#be185d] text-white flex items-center justify-center shadow-xs hover:bg-[#9d174d] transition-transform active:scale-95 cursor-pointer shrink-0"
            title={strings.newStudent}
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto text-xs pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setGradeFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              gradeFilter === 'all'
                ? 'bg-[#be185d] text-white shadow-xs'
                : 'bg-white text-gray-700 border border-[#ffd8e1] hover:border-[#be185d]'
            }`}
          >
            {strings.all} ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setGradeFilter('4-6')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              gradeFilter === '4-6'
                ? 'bg-[#be185d] text-white shadow-xs'
                : 'bg-white text-gray-700 border border-[#ffd8e1] hover:border-[#be185d]'
            }`}
          >
            Grade 4–6 ({students.filter((s) => s.grade >= 4 && s.grade <= 6).length})
          </button>
          <button
            type="button"
            onClick={() => setGradeFilter('7-9')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              gradeFilter === '7-9'
                ? 'bg-[#be185d] text-white shadow-xs'
                : 'bg-white text-gray-700 border border-[#ffd8e1] hover:border-[#be185d]'
            }`}
          >
            Grade 7–9 ({students.filter((s) => s.grade >= 7 && s.grade <= 9).length})
          </button>
          <button
            type="button"
            onClick={() => setGradeFilter('10-12')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              gradeFilter === '10-12'
                ? 'bg-[#be185d] text-white shadow-xs'
                : 'bg-white text-gray-700 border border-[#ffd8e1] hover:border-[#be185d]'
            }`}
          >
            Grade 10–12 ({students.filter((s) => s.grade >= 10 && s.grade <= 12).length})
          </button>
        </div>
      </div>

      {/* Students List Cards */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-500 border border-dashed border-[#ffd8e1]">
            <p className="text-sm font-bold">No students found matching your criteria</p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const initials = getInitials(student.name);

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl p-4 border border-[#ffd8e1] shadow-2xs space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full font-extrabold text-sm flex items-center justify-center border border-[#ffd8e1] shrink-0 ${
                        student.avatarColor || 'bg-[#fff0f2] text-[#be185d]'
                      }`}
                    >
                      {initials}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        {student.name}
                        {student.isVerified && (
                          <span
                            className="material-symbols-outlined text-emerald-500 text-base"
                            title="Active Student"
                          >
                            verified
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="bg-[#fff0f2] text-[#be185d] px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          Grade {student.grade}
                        </span>
                        <span>
                          • {student.sessionsPerWeek || 2} {strings.sessionsPerWk}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-gray-300">school</span>
                </div>

                {/* Schedule Summary Banner */}
                <div className="flex items-center justify-between text-xs text-gray-600 bg-[#fff8f7] p-2.5 rounded-xl border border-[#ffd8e1]/50">
                  <span className="flex items-center gap-1 font-semibold truncate">
                    <span className="material-symbols-outlined text-sm text-[#be185d]">
                      calendar_month
                    </span>
                    {student.scheduleSummary || 'Weekly Scheduled Session'}
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 text-[11px]">
                    Alarm Active
                  </span>
                </div>

                {/* Notes if available */}
                {student.notes && (
                  <p className="text-[11px] text-gray-500 line-clamp-1 italic px-1">
                    {student.notes}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenMessage(student)}
                    className="flex-1 py-2 bg-[#fff0f2] text-[#be185d] font-bold rounded-xl border border-[#ffd8e1] hover:bg-[#ffe2e8] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    {strings.message}
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickSetAlarm(student)}
                    className="flex-1 py-2 bg-[#be185d] text-white font-bold rounded-xl shadow-xs hover:bg-[#9d174d] active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">alarm</span>
                    {strings.setAlarm}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
