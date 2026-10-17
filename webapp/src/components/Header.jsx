import { APP_CURRENT_VERSION } from '../data/changelogData';
import { GitCommit, ChevronRight, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { isSuperAdmin } from '../utils/userProfile';

export default function Header({ profile, onOpenProfile, onOpenChangelog, onOpenStarosta, onOpenAdmin }) {
  const currentProfile = profile || {
    fullName: 'Студент AITU',
    username: 'student',
    group: '9ПО-43к',
    course: 4,
    role: 'student',
    isTelegramAuth: false
  };

  const initials = currentProfile.fullName
    ? currentProfile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'СТ';

  const isStarostaOrAdmin = ['starosta', 'zam_starosty', 'admin', 'superadmin'].includes(currentProfile.role);

  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-b border-neutral-800 px-3.5 py-2">
      <div className="flex items-center justify-between max-w-xl mx-auto gap-2">
        {/* Left: AITU Solid Mark & Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="px-1.5 py-0.5 bg-white text-black font-black text-xs tracking-tight rounded-xs select-none font-mono flex-shrink-0">
            AITU
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-xs tracking-[0.15em] text-white uppercase font-sans truncate">
              AITU // СЕТЬ
            </span>
          </div>
        </div>

        {/* Right: Role Badge (Mutually exclusive: Admin OR Starosta), Pinned Profile Button & Version */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Superadmin Root Access Quick Button (Only for Superadmins) */}
          {isSuperAdmin(currentProfile?.id) ? (
            onOpenAdmin && (
              <button
                onClick={() => {
                  onOpenAdmin();
                  triggerHaptic('medium');
                }}
                className={`flex items-center gap-1 px-2 py-1 font-mono text-[10px] font-bold tracking-wider uppercase transition-all rounded-xs cursor-pointer border ${
                  activeTab === 'admin'
                    ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                    : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                }`}
                title="Панель администратора"
              >
                <span>👑 АДМИН</span>
              </button>
            )
          ) : (
            /* Starosta Hub quick button (Only for Starostas who are not Superadmins) */
            isStarostaOrAdmin && onOpenStarosta && (
              <button
                onClick={() => {
                  onOpenStarosta();
                  triggerHaptic('medium');
                }}
                className="flex items-center gap-1 px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-mono text-[10px] font-bold tracking-wider uppercase transition-all rounded-xs cursor-pointer"
                title="Панель старосты"
              >
                <span>🎖 СТАРОСТА</span>
              </button>
            )
          )}

          {/* Always Pinned Profile Button */}
          <button
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              triggerHaptic('selection');
            }}
            className="flex items-center gap-2 px-2.5 py-1 bg-neutral-900/90 hover:bg-neutral-800 border border-white/20 hover:border-white text-white rounded-xs transition-all active:scale-95 group shadow-sm"
            title="Открыть личный профиль студента"
            aria-label="Личный профиль студента"
          >
            {/* Avatar / Monogram with Status Dot */}
            <div className="relative flex-shrink-0">
              {currentProfile.photoUrl ? (
                <img 
                  src={currentProfile.photoUrl} 
                  alt={currentProfile.fullName} 
                  className="w-5 h-5 rounded-xs object-cover border border-white/30"
                />
              ) : (
                <div className="w-5 h-5 rounded-xs bg-zinc-800 border border-white/30 flex items-center justify-center font-mono text-[9px] text-white font-bold">
                  {initials}
                </div>
              )}
              {currentProfile.isTelegramAuth && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-black animate-pulse" />
              )}
            </div>

            {/* Profile Label and Group Code */}
            <div className="flex flex-col text-left leading-none font-mono">
              <span className="text-[10px] font-bold text-white tracking-wider flex items-center gap-1">
                {currentProfile.group}
                {currentProfile.isPremium && (
                  <span className="text-[8px] text-amber-400">★</span>
                )}
              </span>
              <span className="text-[8px] text-zinc-400 uppercase tracking-tight">
                ПРОФИЛЬ
              </span>
            </div>

            <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors ml-0.5" />
          </button>

          {/* Clickable Version & Changelog Button */}
          {onOpenChangelog && (
            <button
              onClick={() => {
                onOpenChangelog();
                triggerHaptic('light');
              }}
              className="flex items-center gap-1 px-1.5 py-1 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white font-mono text-[10px] tracking-wider uppercase transition-colors rounded-xs"
              title="История обновлений"
            >
              <GitCommit className="w-3 h-3 text-zinc-500" />
              <span className="hidden sm:inline">{APP_CURRENT_VERSION}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
