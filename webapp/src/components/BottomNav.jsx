import React from 'react';

export default function BottomNav({ activeTab, onTabChange, isAdmin }) {
  const tabs = [
    { id: 'schedule', num: '01', label: 'ПАРЫ' },
    { id: 'lectures', num: '02', label: 'ЛЕКЦИИ' },
    { id: 'services', num: '03', label: 'СЕРВИСЫ' },
    { id: 'esports', num: '04', label: 'КИБЕРСПОРТ' },
    ...(isAdmin ? [{ id: 'admin', num: '05', label: 'АДМИН', isSpecial: true }] : []),
  ];

  const handleTabClick = (id) => {
    onTabChange(id);
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-t border-neutral-800 safe-bottom">
      <div className={`max-w-xl mx-auto grid ${tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`py-3 px-1 sm:px-2 flex flex-col items-center justify-center transition-all border-t-2 relative ${
                isActive
                  ? 'border-white text-white bg-neutral-900/40'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <div className="font-mono text-[9px] tracking-widest text-neutral-500">
                {tab.num}
              </div>
              <span className={`text-[10px] sm:text-[11px] font-bold tracking-[0.1em] sm:tracking-[0.15em] uppercase mt-0.5 whitespace-nowrap ${
                isActive ? 'text-white' : 'text-neutral-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
