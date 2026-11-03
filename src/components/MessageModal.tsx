import React, { useState } from 'react';
import { Student } from '../types';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  if (!isOpen || !student) return null;

  const defaultMsg = `Hi ${student.name}, this is your tutor! Just a reminder for our upcoming lesson (${student.scheduleSummary || 'scheduled this week'}). Please have your notebook and exercises ready. See you soon!`;

  const [message, setMessage] = useState(defaultMsg);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPhone = (student.phone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-[#ffd8e1] space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffd8e1]/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#fff0f2] text-[#be185d] flex items-center justify-center font-bold text-xs">
              <span className="material-symbols-outlined text-base">chat</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">
                Message {student.name}
              </h3>
              <p className="text-[11px] text-gray-400">
                Grade {student.grade} • {student.phone || 'No direct phone'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#9d224b] uppercase tracking-wider block">
            Reminder Message
          </label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-[#fff8f7] border border-[#ffd8e1] rounded-2xl p-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#be185d]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 bg-[#fff0f2] text-[#be185d] font-bold rounded-xl border border-[#ffd8e1] hover:bg-[#ffe2e8] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied!' : 'Copy Text'}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            WhatsApp
          </a>
        </div>

        {student.phone && (
          <a
            href={smsUrl}
            className="block text-center text-xs font-bold text-gray-500 hover:text-[#be185d] py-1 underline"
          >
            Open in Phone Messages (SMS)
          </a>
        )}
      </div>
    </div>
  );
};
