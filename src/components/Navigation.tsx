import React from 'react';
import { strings } from '../utils/translations';

export type NavTab = 'next' | 'schedule' | 'alarms' | 'students' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  alarmActive: boolean;
}

const TABS: { key: NavTab; icon: string; label: string }[] = [
  { key: 'next', icon: 'upcoming', label: strings.next },
  { key: 'schedule', icon: 'calendar_today', label: strings.schedule },
  { key: 'alarms', icon: 'alarm', label: strings.alarms },
  { key: 'students', icon: 'school', label: strings.students },
  { key: 'settings', icon: 'tune', label: strings.settings },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  alarmActive,
}) => {
  return (
    <nav className="fixed sm:absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-[#ffd8e1] flex items-center justify-around py-2.5 z-20">
      {TABS.map(({ key, icon, label }) => {
        const isActive = currentTab === key;
        const showBadge = key === 'alarms' && alarmActive;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={`flex flex-col items-center transition-colors cursor-pointer relative px-1 ${
              isActive ? 'text-[#be185d]' : 'text-gray-400 hover:text-[#be185d]'
            }`}
          >
            <span
              className={`material-symbols-outlined text-2xl ${isActive ? 'fill-icon' : ''} ${
                showBadge ? 'animate-bounce text-[#be185d]' : ''
              }`}
            >
              {icon}
            </span>
            {showBadge && (
              <span className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
            <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
