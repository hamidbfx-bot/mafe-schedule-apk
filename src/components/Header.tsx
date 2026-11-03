import React, { useEffect, useState } from 'react';
import { strings } from '../utils/translations';
import { formatManilaClock } from '../utils/timezone';

interface HeaderProps {
  currentMonth: string;
  onMonthClick?: () => void;
  onNotificationClick: () => void;
  onProfileClick: () => void;
  activeAlarmCount: number;
  isLiveConnected: boolean;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  onMonthClick,
  onNotificationClick,
  onProfileClick,
  activeAlarmCount,
  isLiveConnected,
  isSyncing,
}) => {
  const [clock, setClock] = useState(() => formatManilaClock());
  useEffect(() => {
    const t = window.setInterval(() => setClock(formatManilaClock()), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-[#ffd8e1]/40 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <button
          onClick={onMonthClick}
          type="button"
          className="flex items-center gap-2 bg-[#fff0f2] px-3.5 py-1.5 rounded-full border border-[#ffd8e1] hover:bg-[#ffe2e8] transition-colors cursor-pointer text-left shadow-2xs"
        >
          <span className="material-symbols-outlined text-[#be185d] text-lg">calendar_month</span>
          <span className="text-xs font-bold text-[#be185d]">{currentMonth}</span>
        </button>

        {/* Manila clock + daily sync badge */}
        <div
          title={strings.timesInManila}
          className="flex flex-col items-start px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800"
        >
          <span className="text-[10px] font-black tabular-nums leading-tight">{clock}</span>
          <span className="text-[8px] font-bold leading-tight flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSyncing
                  ? 'bg-amber-500 animate-ping'
                  : isLiveConnected
                  ? 'bg-emerald-500'
                  : 'bg-gray-400'
              }`}
            />
            {isSyncing ? strings.syncing : 'Manila • Daily sync'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNotificationClick}
          type="button"
          aria-label={strings.notifications}
          className="relative w-9 h-9 rounded-full bg-[#fff0f2] text-[#be185d] flex items-center justify-center border border-[#ffd8e1] hover:bg-[#ffe2e8] transition-all cursor-pointer shadow-2xs"
        >
          <span className="material-symbols-outlined text-lg">notifications</span>
          {activeAlarmCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
              {activeAlarmCount}
            </span>
          )}
        </button>

        <button
          onClick={onProfileClick}
          type="button"
          aria-label="Settings and Database"
          className="w-9 h-9 rounded-full bg-[#be185d] text-white flex items-center justify-center shadow-xs hover:bg-[#9d224b] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">person</span>
        </button>
      </div>
    </header>
  );
};
