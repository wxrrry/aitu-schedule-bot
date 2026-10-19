import React from 'react';
import { Home, Trophy, Shield, Users, Map, Activity, Swords } from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';

export const CYBER_TABS = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'tournaments', label: 'Турниры', icon: Trophy },
  { id: 'teams', label: 'Команды', icon: Shield },
  { id: 'players', label: 'Игроки', icon: Users },
  { id: 'maps', label: 'Карты', icon: Map },
  { id: 'stats', label: 'Статы', icon: Activity },
  { id: 'compare', label: 'Дуэли', icon: Swords },
];

export default function CyberNavDock({ activeTab, onTabChange }) {
  const handleSelect = (id) => {
    onTabChange(id);
    triggerHaptic('selection');
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[min(calc(100%-16px),780px)] pointer-events-auto select-none">
      <nav className="relative flex items-center justify-between gap-1 rounded-xl border border-[#212121] bg-[#111111]/95 p-1 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-x-auto no-scrollbar">
        {CYBER_TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`group relative z-10 flex min-h-10 flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-1 px-1.5 transition-all duration-150 active:scale-[0.97] cursor-pointer shrink-0 ${
                active 
                  ? 'bg-[#18202c] border border-[#0ea5e9]/40 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon 
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                  active ? 'text-[#0ea5e9]' : 'text-zinc-400 group-hover:text-zinc-200'
                }`} 
              />
              <span className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
                active ? 'text-white' : 'text-zinc-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
