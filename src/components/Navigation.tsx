import React from 'react';
import { strings } from '../utils/translations';

export type NavTab = 'schedule' | 'alarms' | 'students' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  alarmActive: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  alarmActive,
}) => {
  return (
    <nav className="fixed sm:absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-[#ffd8e1] flex items-center justify-around py-2.5 z-20">
      {/* Schedule */}
      <button
        type="button"
        onClick={() => onTabChange('schedule')}
        className={`flex flex-col items-center transition-colors cursor-pointer ${
          currentTab === 'schedule' ? 'text-[#be185d]' : 'text-gray-400 hover:text-[#be185d]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-2xl ${
            currentTab === 'schedule' ? 'fill-icon' : ''
          }`}
        >
          calendar_today
        </span>
        <span
          className={`text-[11px] ${currentTab === 'schedule' ? 'font-bold' : 'font-medium'}`}
        >
          {strings.schedule}
        </span>
      </button>

      {/* Alarms */}
      <button
        type="button"
        onClick={() => onTabChange('alarms')}
        className={`flex flex-col items-center transition-colors cursor-pointer relative ${
          currentTab === 'alarms' ? 'text-[#be185d]' : 'text-gray-400 hover:text-[#be185d]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-2xl ${
            currentTab === 'alarms' ? 'fill-icon' : ''
          } ${alarmActive ? 'animate-bounce text-[#be185d]' : ''}`}
        >
          alarm
        </span>
        {alarmActive && (
          <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
        )}
        <span className={`text-[11px] ${currentTab === 'alarms' ? 'font-bold' : 'font-medium'}`}>
          {strings.alarms}
        </span>
      </button>

      {/* Students */}
      <button
        type="button"
        onClick={() => onTabChange('students')}
        className={`flex flex-col items-center transition-colors cursor-pointer ${
          currentTab === 'students' ? 'text-[#be185d]' : 'text-gray-400 hover:text-[#be185d]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-2xl ${
            currentTab === 'students' ? 'fill-icon' : ''
          }`}
        >
          school
        </span>
        <span
          className={`text-[11px] ${currentTab === 'students' ? 'font-bold' : 'font-medium'}`}
        >
          {strings.students}
        </span>
      </button>

      {/* Settings */}
      <button
        type="button"
        onClick={() => onTabChange('settings')}
        className={`flex flex-col items-center transition-colors cursor-pointer ${
          currentTab === 'settings' ? 'text-[#be185d]' : 'text-gray-400 hover:text-[#be185d]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-2xl ${
            currentTab === 'settings' ? 'fill-icon' : ''
          }`}
        >
          tune
        </span>
        <span
          className={`text-[11px] ${currentTab === 'settings' ? 'font-bold' : 'font-medium'}`}
        >
          {strings.settings}
        </span>
      </button>
    </nav>
  );
};
