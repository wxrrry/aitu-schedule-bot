import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ScheduleTab from './components/ScheduleTab';
import ErrorBoundary from './components/ErrorBoundary';
import TelegramOnlyGuard from './components/TelegramOnlyGuard';
import { getInitialUserProfile, saveUserProfile, syncProfileFromCloud, isSuperAdmin } from './utils/userProfile';
import { isInsideTelegram } from './utils/telegram';

// Динамический импорт (Code Splitting) для ускорения первичной загрузки в Telegram WebView
import ChangelogModal from './components/ChangelogModal';
const LecturesTab = lazy(() => import('./components/LecturesTab'));
const ServicesTab = lazy(() => import('./components/ServicesTab'));
const EsportsTab = lazy(() => import('./components/EsportsTab'));
const AdminTab = lazy(() => import('./components/AdminTab'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const StarostaModal = lazy(() => import('./components/StarostaModal'));

// Минималистичный скелетон загрузки модулей
function TabLoadingFallback() {
  return (
    <div className="py-16 flex flex-col items-center justify-center space-y-3 font-mono">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      <span className="text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">
        ЗАГРУЗКА МОДУЛЯ // AITU
      </span>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule', 'lectures', 'services', 'esports'
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStarostaOpen, setIsStarostaOpen] = useState(false);

  // Глобальный авторизованный профиль студента и привязка к группе
  const [profile, setProfile] = useState(() => getInitialUserProfile());

  const handleUpdateProfile = (newProfile) => {
    setProfile(newProfile);
    saveUserProfile(newProfile);
  };

  useEffect(() => {
    // Инициализация Telegram WebApp при открытии внутри мессенджера
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor('#09090b');
        tg.setBackgroundColor('#09090b');
      } catch (e) {
        console.debug('Header color set error', e);
      }
    }

    // Фоновая синхронизация профиля из Telegram CloudStorage (межплатформенный бэкап)
    syncProfileFromCloud((cloudProfile) => {
      if (cloudProfile && cloudProfile.group) {
        setProfile(prev => ({
          ...prev,
          ...cloudProfile,
          id: prev.isTelegramAuth ? prev.id : (cloudProfile.id || prev.id),
          fullName: prev.isTelegramAuth ? prev.fullName : (cloudProfile.fullName || prev.fullName)
        }));
      }
    });
  }, []);

  // Если приложение открыто в обычном браузере по ссылке, а не внутри Telegram Mini App
  if (!isInsideTelegram()) {
    return <TelegramOnlyGuard />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
        {/* Шапка приложения с кнопкой профиля, панели старосты и версией ченджлога */}
        <Header 
          activeTab={activeTab} 
          profile={profile}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenChangelog={() => setIsChangelogOpen(true)} 
          onOpenStarosta={() => setIsStarostaOpen(true)}
          onOpenAdmin={() => setActiveTab('admin')}
        />

        {/* Основная рабочая область */}
        <main className="flex-1 w-full max-w-xl mx-auto px-3.5 pt-3">
          <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === 'schedule' && (
              <ScheduleTab 
                profile={profile} 
                onUpdateProfile={handleUpdateProfile} 
                onOpenProfile={() => setIsProfileOpen(true)}
              />
            )}
            {activeTab === 'lectures' && (
              <LecturesTab 
                profile={profile}
                onOpenProfile={() => setIsProfileOpen(true)}
              />
            )}
            {activeTab === 'services' && (
              <ServicesTab 
                profile={profile}
                onOpenProfile={() => setIsProfileOpen(true)}
                onOpenChangelog={() => setIsChangelogOpen(true)} 
                onOpenStarosta={() => setIsStarostaOpen(true)}
              />
            )}
            {activeTab === 'esports' && (
              <EsportsTab />
            )}
            {activeTab === 'admin' && isSuperAdmin(profile?.id) && (
              <AdminTab profile={profile} />
            )}
          </Suspense>
        </main>

        {/* Модальные окна с ленивой загрузкой */}
        <Suspense fallback={null}>
          {isProfileOpen && (
            <ProfileModal
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onNavigateTab={(tab) => {
                setIsProfileOpen(false);
                setActiveTab(tab);
              }}
              onOpenStarosta={() => setIsStarostaOpen(true)}
              onOpenTeam={(teamName) => {
                setIsProfileOpen(false);
                setActiveTab('esports');
              }}
              onOpenPlayer={(playerNick) => {
                setIsProfileOpen(false);
                setActiveTab('esports');
              }}
            />
          )}

          {isStarostaOpen && (
            <StarostaModal
              isOpen={isStarostaOpen}
              onClose={() => setIsStarostaOpen(false)}
              profile={profile}
            />
          )}

          {isChangelogOpen && (
            <ChangelogModal 
              isOpen={isChangelogOpen} 
              onClose={() => setIsChangelogOpen(false)} 
            />
          )}
        </Suspense>

        {/* Нижняя навигационная панель */}
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          isAdmin={isSuperAdmin(profile?.id)} 
        />
      </div>
    </ErrorBoundary>
  );
}
