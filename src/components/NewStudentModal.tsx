import React, { useState } from 'react';
import { GradeLevel, Student } from '../types';
import { strings } from '../utils/translations';

interface NewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
}

export const NewStudentModal: React.FC<NewStudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeLevel>(7);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(2);
  const [scheduleSummary, setScheduleSummary] = useState('Mon, Thu @ 10:00');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const colors = [
      'bg-[#fff0f2] text-[#be185d]',
      'bg-blue-50 text-blue-700',
      'bg-purple-50 text-purple-700',
      'bg-emerald-50 text-emerald-700',
      'bg-amber-50 text-amber-700',
      'bg-teal-50 text-teal-700',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    onSave({
      id: `s-${Date.now()}`,
      name: name.trim(),
      grade,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      sessionsPerWeek,
      scheduleSummary: scheduleSummary.trim() || undefined,
      notes: notes.trim() || undefined,
      isVerified: true,
      avatarColor: randomColor,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-[#ffd8e1] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#ffd8e1]/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#fff0f2] text-[#be185d] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">person_add</span>
            </div>
            <h3 className="font-bold text-base text-[#be185d]">
              Add New Student
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-[#9d224b] uppercase block mb-1">
              {strings.studentName} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Liam, Sara, etc."
              className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#be185d]"
            />
          </div>

          <div>
            <label className="font-bold text-[#9d224b] uppercase block mb-1">
              {strings.gradeLevel} (1 - 12)
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value, 10) as GradeLevel)}
              className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-[#9d224b] uppercase block mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0123"
                className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-[#9d224b] uppercase block mb-1">Sessions / Week</label>
              <input
                type="number"
                min={1}
                max={7}
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#9d224b] uppercase block mb-1">
              Regular Schedule
            </label>
            <input
              type="text"
              value={scheduleSummary}
              onChange={(e) => setScheduleSummary(e.target.value)}
              placeholder="e.g. Mon, Thu @ 10:00"
              className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-[#9d224b] uppercase block mb-1">
              Learning Focus & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key focus areas, goals..."
              className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-xl p-2.5 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-center font-bold text-gray-500 bg-[#fff0f2] rounded-xl border border-[#ffd8e1]"
            >
              {strings.cancel}
            </button>
            <button
              type="submit"
              className="flex-[2] py-2.5 text-center font-bold text-white bg-[#be185d] rounded-xl shadow-2xs hover:bg-[#9d174d]"
            >
              Save Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
