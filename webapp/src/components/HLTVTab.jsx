import React, { useState, useEffect, useMemo } from 'react';
import { Camera, ChevronLeft, ArrowLeft } from 'lucide-react';
import { 
  TOURNAMENTS_LIST,
  CS2_PLAYERS,
  HLTV_TEAM_RANKINGS
} from '../data/cs2TournamentData';
import PlayerModal from './PlayerModal';
import TeamModal from './TeamModal';
import TeamRegistrationModal from './TeamRegistrationModal';
import TournamentOrganizerModal from './TournamentOrganizerModal';
import CyberNavDock from './cyber/CyberNavDock';
import CyberHomeTab from './cyber/CyberHomeTab';
import CyberTournamentsTab from './cyber/CyberTournamentsTab';
import CyberRankingsTab from './cyber/CyberRankingsTab';
import CyberMapsTab from './cyber/CyberMapsTab';
import CyberStatsTab from './cyber/CyberStatsTab';
import CyberCompareTab from './cyber/CyberCompareTab';
import { 
  getAllTournaments, 
  syncTournamentsFromApi,
  confirmMatchScoreAndAdvance
} from '../utils/tournamentManager';
import { getUserProfile, isSuperAdmin, isOrganizer, setOrganizerMode } from '../utils/userProfile';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';

export default function HLTVTab() {
  const [tournamentsList, setTournamentsList] = useState(() => getAllTournaments());
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentTab, setTournamentTab] = useState('bracket');
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [cyberTab, setCyberTab] = useState('home'); // 'home' | 'tournaments' | 'rankings' | 'maps' | 'stats' | 'compare'
  const [rankingSubTab, setRankingSubTab] = useState('teams'); // 'teams' | 'players'
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSort, setPlayerSort] = useState('kills'); // 'kills', 'kd', 'hs'

  const sortedPlayersList = useMemo(() => {
    let list = Object.values(CS2_PLAYERS);
    if (playerSearch.trim()) {
      const q = playerSearch.trim().toLowerCase();
      list = list.filter(p => 
        p.nick.toLowerCase().includes(q) || 
        (p.team && p.team.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (playerSort === 'kd') {
        return parseFloat(b.kdRatio || 0) - parseFloat(a.kdRatio || 0);
      }
      if (playerSort === 'hs') {
        return parseInt(b.hsPercentage || 0) - parseInt(a.hsPercentage || 0);
      }
      return b.totalKills - a.totalKills;
    });
  }, [playerSearch, playerSort]);

  // Match screenshot & scoring state
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [editingScoreMatchId, setEditingScoreMatchId] = useState(null);
  const [scoreTeam1, setScoreTeam1] = useState('2');
  const [scoreTeam2, setScoreTeam2] = useState('0');
  const [scoreScreenshot, setScoreScreenshot] = useState(null);
  const [copiedMatchId, setCopiedMatchId] = useState(null);

  // Tournament organization modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isOrganizerModalOpen, setIsOrganizerModalOpen] = useState(false);
  const [registerTournament, setRegisterTournament] = useState(null);

  const profile = getUserProfile();
  const isSuper = isSuperAdmin(profile?.id);
  const [organizerMode, setOrganizerModeState] = useState(() => isOrganizer(profile?.id, profile?.role));
  const canOrganize = organizerMode || isSuper || isOrganizer(profile?.id, profile?.role);

  useEffect(() => {
    syncTournamentsFromApi();

    const handleRoleChanged = () => {
      setOrganizerModeState(isOrganizer(profile?.id, profile?.role));
    };

    const handleUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setTournamentsList(e.detail);
        if (selectedTournament) {
          const refreshedSelected = e.detail.find(t => t.id === selectedTournament.id);
          if (refreshedSelected) setSelectedTournament(refreshedSelected);
        }
      }
    };
    window.addEventListener('aitu_tournaments_updated', handleUpdated);
    window.addEventListener('aitu_role_changed', handleRoleChanged);
    return () => {
      window.removeEventListener('aitu_tournaments_updated', handleUpdated);
      window.removeEventListener('aitu_role_changed', handleRoleChanged);
    };
  }, [selectedTournament, profile]);

  const handleTournamentsUpdated = (updatedList) => {
    setTournamentsList(updatedList);
    if (selectedTournament) {
      const refreshedSelected = updatedList.find(t => t.id === selectedTournament.id);
      if (refreshedSelected) setSelectedTournament(refreshedSelected);
    }
  };

  const handleTeamRegistered = () => {
    const refreshed = getAllTournaments();
    setTournamentsList(refreshed);
    if (selectedTournament) {
      const refreshedSelected = refreshed.find(t => t.id === selectedTournament.id);
      if (refreshedSelected) setSelectedTournament(refreshedSelected);
    }
  };

  // Привязка нативной кнопки Назад в Telegram для выхода из турнира или возврата на главную
  useTelegramBackButton(Boolean(selectedTournament || cyberTab !== 'home'), () => {
    if (selectedTournament) {
      setSelectedTournament(null);
    } else if (cyberTab !== 'home') {
      setCyberTab('home');
    }
    triggerHaptic('light');
  });

  const handleOpenTeam = (teamOrName) => {
    let teamObj = null;
    if (typeof teamOrName === 'string') {
      teamObj = HLTV_TEAM_RANKINGS.find(
        t => t.name.toLowerCase() === teamOrName.toLowerCase()
      ) || { name: teamOrName };
    } else {
      teamObj = teamOrName;
    }
    setSelectedTeam(teamObj);
    triggerHaptic('selection');
  };

  const handleOpenPlayer = (playerNick) => {
    const p = CS2_PLAYERS[playerNick] || {
      nick: playerNick,
      team: "AITU",
      elo: 1000,
      kdRatio: "1.00",
      hsPercentage: "50%",
      winRate: "50%",
      matchesPlayed: 1,
      totalKills: 20,
      totalDeaths: 20,
      totalAssists: 5,
      badges: ["УЧАСТНИК ТУРНИРА"]
    };
    setSelectedPlayer(p);
    triggerHaptic('selection');
  };

  const handleOpenMatch = (matchId) => {
    const tourn = tournamentsList.find(t => t.matches?.some(m => m.id === matchId)) || tournamentsList[0];
    setSelectedTournament(tourn);
    setSelectedMatchId(matchId);
    setTournamentTab('matches');
    setCyberTab('tournaments');
    triggerHaptic('medium');
  };

  const handleCopyMatchResult = (match) => {
    if (!match) return;
    const winner = match.team1.score > match.team2.score ? match.team1.name : match.team2.name;
    const text = `🏆 AITU CS2: ${match.team1.name} [${match.team1.score}:${match.team2.score}] ${match.team2.name} (${match.stage})\nПобедитель матча: ${winner} 🏆`;
    navigator.clipboard?.writeText(text);
    setCopiedMatchId(match.id);
    triggerHaptic('selection');
    setTimeout(() => setCopiedMatchId(null), 2500);
  };

  const compressImageFile = (file, maxWidth = 1280, quality = 0.82) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target.result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleScreenshotFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 1280, 0.82);
      if (compressedDataUrl) {
        setScoreScreenshot(compressedDataUrl);
        triggerHaptic('light');
      }
    } catch (err) {
      console.warn('Screenshot compression error:', err);
    }
  };

  const handleConfirmMatchScore = (matchId) => {
    if (!selectedTournament || !matchId) return;
    const updated = confirmMatchScoreAndAdvance(
      selectedTournament.id,
      matchId,
      scoreTeam1,
      scoreTeam2,
      scoreScreenshot
    );
    if (updated) {
      setSelectedTournament({ ...updated });
      setEditingScoreMatchId(null);
      setScoreScreenshot(null);
      triggerHaptic('success');
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs pb-28 animate-fadeIn">
      {/* Универсальная верхняя панель НАЗАД при нахождении в подразделах или турнире */}
      {cyberTab !== 'home' && (
        <div className="sticky top-0 z-30 flex items-center justify-between p-2 bg-[#0e0e11]/95 backdrop-blur-md border border-[#26262f] rounded-xl select-none shadow-lg">
          <button
            onClick={() => {
              if (selectedTournament) {
                setSelectedTournament(null);
              } else {
                setCyberTab('home');
              }
              triggerHaptic('light');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#18181f] hover:bg-[#23232c] active:bg-[#2a2a35] border border-[#343442] text-zinc-100 hover:text-white text-xs font-bold font-mono uppercase rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-[#0ea5e9]" />
            <span>
              {selectedTournament ? 'НАЗАД К СПИСКУ ТУРНИРОВ' : 'НАЗАД НА ГЛАВНУЮ'}
            </span>
          </button>

          {selectedTournament && (
            <button
              onClick={() => {
                setSelectedTournament(null);
                setCyberTab('home');
                triggerHaptic('light');
              }}
              className="px-2.5 py-1.5 bg-black/40 hover:bg-[#1a1a22] border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer"
              title="На главную страницу киберспорта"
            >
              НА ГЛАВНУЮ ✕
            </button>
          )}
        </div>
      )}

      {/* 1. ГЛАВНАЯ СТРАНИЦА */}
      {cyberTab === 'home' && (
        <CyberHomeTab
          onNavigate={(tab) => {
            setCyberTab(tab);
            triggerHaptic('selection');
          }}
          onOpenPlayer={handleOpenPlayer}
          onOpenTeam={handleOpenTeam}
          onOpenMatch={handleOpenMatch}
          onOpenRegister={() => setIsRegisterModalOpen(true)}
          onOpenOrganizer={() => setIsOrganizerModalOpen(true)}
          canOrganize={canOrganize}
        />
      )}

      {/* 2. ТУРНИРЫ */}
      {cyberTab === 'tournaments' && (
        <CyberTournamentsTab
          tournamentsList={tournamentsList}
          selectedTournament={selectedTournament}
          setSelectedTournament={setSelectedTournament}
          tournamentTab={tournamentTab}
          setTournamentTab={setTournamentTab}
          selectedMatchId={selectedMatchId}
          setSelectedMatchId={setSelectedMatchId}
          canOrganize={canOrganize}
          isSuper={isSuper}
          onOpenRegisterModal={(tourn) => {
            setRegisterTournament(tourn);
            setIsRegisterModalOpen(true);
          }}
          onOpenOrganizerModal={() => {
            if (!canOrganize && isSuper) {
              setOrganizerMode(true);
              setOrganizerModeState(true);
            }
            setIsOrganizerModalOpen(true);
          }}
          onOpenTeam={handleOpenTeam}
          onOpenPlayer={handleOpenPlayer}
          onViewScreenshot={(url) => {
            setViewingScreenshot(url);
            triggerHaptic('selection');
          }}
          handleScreenshotFile={handleScreenshotFile}
          scoreScreenshot={scoreScreenshot}
          editingScoreMatchId={editingScoreMatchId}
          setEditingScoreMatchId={setEditingScoreMatchId}
          scoreTeam1={scoreTeam1}
          setScoreTeam1={setScoreTeam1}
          scoreTeam2={scoreTeam2}
          setScoreTeam2={setScoreTeam2}
          handleConfirmMatchScore={handleConfirmMatchScore}
          handleCopyMatchResult={handleCopyMatchResult}
          copiedMatchId={copiedMatchId}
        />
      )}

      {/* 3. РЕЙТИНГ (КОМАНДЫ И ИГРОКИ) */}
      {(cyberTab === 'teams' || cyberTab === 'players' || cyberTab === 'rankings') && (
        <CyberRankingsTab
          sortedPlayersList={sortedPlayersList}
          playerSearch={playerSearch}
          setPlayerSearch={setPlayerSearch}
          playerSort={playerSort}
          setPlayerSort={setPlayerSort}
          rankingSubTab={cyberTab === 'players' ? 'players' : cyberTab === 'teams' ? 'teams' : rankingSubTab}
          setRankingSubTab={(sub) => {
            setRankingSubTab(sub);
            setCyberTab(sub);
          }}
          onOpenPlayer={handleOpenPlayer}
          onOpenTeam={handleOpenTeam}
        />
      )}

      {/* 4. КАРТЫ (CS2 MAP POOL META) */}
      {cyberTab === 'maps' && (
        <CyberMapsTab onOpenPlayer={handleOpenPlayer} />
      )}

      {/* 5. СТАТИСТИКА ЛИГИ И РЕКОРДЫ */}
      {cyberTab === 'stats' && (
        <CyberStatsTab 
          onOpenPlayer={handleOpenPlayer} 
          onOpenTeam={handleOpenTeam} 
        />
      )}

      {/* 6. СРАВНЕНИЕ (HEAD-TO-HEAD DUELS) */}
      {cyberTab === 'compare' && (
        <CyberCompareTab 
          onOpenPlayer={handleOpenPlayer} 
          onOpenTeam={handleOpenTeam} 
        />
      )}

      {/* Floating Bottom Navigation Dock */}
      <CyberNavDock activeTab={cyberTab} onTabChange={setCyberTab} />

      {/* Team Modal */}
      {selectedTeam && (
        <TeamModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onSelectPlayer={(playerNick) => {
            handleOpenPlayer(playerNick);
          }}
          onSelectMatch={(matchId) => {
            setSelectedTeam(null);
            handleOpenMatch(matchId);
          }}
        />
      )}

      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onSelectTeam={(teamName) => {
            handleOpenTeam(teamName);
          }}
        />
      )}

      {/* Team Registration Modal */}
      {isRegisterModalOpen && (
        <TeamRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => {
            setIsRegisterModalOpen(false);
            setRegisterTournament(null);
          }}
          tournament={registerTournament || tournamentsList.find(t => t.type === 'upcoming') || tournamentsList[0]}
          profile={profile}
          onRegistered={handleTeamRegistered}
        />
      )}

      {/* Tournament Organizer Modal */}
      {isOrganizerModalOpen && (
        <TournamentOrganizerModal
          isOpen={isOrganizerModalOpen}
          onClose={() => setIsOrganizerModalOpen(false)}
          onTournamentsUpdated={handleTournamentsUpdated}
        />
      )}

      {/* Fullscreen Screenshot Zoom Modal */}
      {viewingScreenshot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/95 backdrop-blur-sm animate-fadeIn font-mono"
          onClick={() => setViewingScreenshot(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-[#111111] border border-[#2e2e2e] rounded-2xl p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#212121] pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>ТАБЛО МАТЧА · SCOREBOARD ПРОТОКОЛ</span>
              </div>
              <button
                onClick={() => setViewingScreenshot(null)}
                className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white px-2.5 py-1 bg-zinc-900 border border-[#3e3e3e] hover:bg-[#252525] rounded-md transition-colors cursor-pointer font-bold"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>НАЗАД</span>
              </button>
            </div>

            <div className="bg-[#0e0e0e] border border-[#212121] rounded-xl overflow-hidden flex items-center justify-center p-1 max-h-[75vh]">
              <img 
                src={viewingScreenshot} 
                alt="Итоги матча CS2" 
                className="w-full h-full max-h-[72vh] object-contain block select-none"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-sans pt-1">
              <span>Официальный скриншот матча</span>
              <a
                href={viewingScreenshot}
                target="_blank"
                rel="noreferrer"
                download="cs2_match_scoreboard.png"
                className="text-cyan-400 hover:underline uppercase font-bold"
              >
                СКАЧАТЬ В ИСХОДНОМ КАЧЕСТВЕ
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
