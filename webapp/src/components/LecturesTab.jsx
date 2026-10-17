import React, { useState } from 'react';
import { Search, Check, Copy, BookOpen, X, Download, ArrowUpRight, List, Star, CheckCircle, Bookmark } from 'lucide-react';
import { REAL_LECTURES, SUBJECT_MAP } from '../data/lecturesData';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';
import MarkdownViewer from './MarkdownViewer';

export default function LecturesTab({ profile, onOpenProfile }) {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [activeLectureModal, setActiveLectureModal] = useState(null);
  const [courseScope, setCourseScope] = useState('my_group'); // 'my_group' or 'all'

  const studentCourse = profile?.course || 4;
  const studentGroup = profile?.group || '9ПО-43к';

  // Избранное и статус изучения
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aitu_lecture_favs') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [readLectures, setReadLectures] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aitu_lecture_read') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Native TG BackButton
  useTelegramBackButton(!!activeLectureModal, () => setActiveLectureModal(null));

  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('aitu_lecture_favs', JSON.stringify(next));
    triggerHaptic('selection');
  };

  const toggleRead = (id, e) => {
    if (e) e.stopPropagation();
    const next = readLectures.includes(id) ? readLectures.filter(x => x !== id) : [...readLectures, id];
    setReadLectures(next);
    localStorage.setItem('aitu_lecture_read', JSON.stringify(next));
    triggerHaptic('success');
  };

  // Лекции с учетом выбранного режима отображения (моя группа / все курсы)
  const scopedLectures = REAL_LECTURES.filter(lec => {
    if (courseScope === 'all') return true;
    return lec.course === studentCourse || 
      (lec.courses && lec.courses.includes(studentCourse)) || 
      (lec.groups && lec.groups.includes(studentGroup));
  });

  // Динамические предметы для панели фильтрации
  const availableSubjectCodes = Array.from(new Set(scopedLectures.map(l => l.subject_code)));
  const subjects = [
    { code: 'ALL', name: 'ВСЕ ПРЕДМЕТЫ' },
    { code: 'FAV', name: `★ ИЗБРАННОЕ (${favorites.length})` },
    ...availableSubjectCodes.map(code => ({
      code,
      name: SUBJECT_MAP[code]?.name?.toUpperCase() || code.toUpperCase()
    }))
  ];

  // Извлечение сниппета совпадения из текста конспекта с контекстом
  const extractSnippet = (content, query) => {
    if (!content || !query || query.trim().length < 2) return null;
    const lowerContent = content.toLowerCase();
    const lowerQ = query.toLowerCase().trim();
    const pos = lowerContent.indexOf(lowerQ);
    if (pos === -1) return null;

    const start = Math.max(0, pos - 45);
    const end = Math.min(content.length, pos + lowerQ.length + 75);
    let snippet = content.slice(start, end).replace(/[\r\n#*`_|>]+/g, ' ').trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return snippet;
  };

  const renderHighlightedText = (text, query) => {
    if (!query || !text) return text;
    const cleanQ = query.trim();
    if (cleanQ.length === 0) return text;
    try {
      const parts = text.split(new RegExp(`(${cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === cleanQ.toLowerCase() ? (
          <mark key={i} className="bg-amber-400 text-black px-1 font-bold rounded-xs not-italic">
            {part}
          </mark>
        ) : part
      );
    } catch (e) {
      return text;
    }
  };

  const filteredLectures = scopedLectures.map(lec => {
    const q = search.toLowerCase().trim();
    if (!q) return { ...lec, snippet: null };

    const inTitle = lec.title?.toLowerCase().includes(q);
    const inSummary = lec.summary?.toLowerCase().includes(q);
    const inSubject = lec.subject?.toLowerCase().includes(q);
    const inTeacher = lec.teacher?.toLowerCase().includes(q);
    const inDate = lec.date?.toLowerCase().includes(q);
    const inKeyPoints = lec.key_points?.some(kp => kp.toLowerCase().includes(q));
    const inContent = lec.content?.toLowerCase().includes(q);

    const matchesSearch = inTitle || inSummary || inSubject || inTeacher || inDate || inKeyPoints || inContent;
    if (!matchesSearch) return null;

    const snippet = inContent ? extractSnippet(lec.content, q) : null;
    return { ...lec, snippet };
  }).filter(Boolean).filter(lec => {
    if (selectedSubject === 'FAV') {
      return favorites.includes(lec.id);
    }
    if (selectedSubject === 'ALL') {
      return true;
    }
    return lec.subject_code === selectedSubject;
  });

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    triggerHaptic('success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadMd = (lecture) => {
    const blob = new Blob([lecture.content || lecture.summary], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lecture.file || `${lecture.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    triggerHaptic('light');
  };

  const courseReadCount = scopedLectures.filter(l => readLectures.includes(l.id)).length;
  const studyProgress = scopedLectures.length > 0 
    ? Math.round((courseReadCount / scopedLectures.length) * 100) 
    : 0;

  return (
    <div className="space-y-4 pb-20 animate-fadeIn font-sans">
      {/* Group & Course Personalization Banner */}
      <div className="p-3.5 bg-[#0a0a0c] border border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="space-y-0.5">
          <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
            ПЕРСОНАЛИЗАЦИЯ ПО ВАШЕЙ ГРУППЕ
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-white tracking-tight">
              {studentGroup}
            </span>
            <span className="px-1.5 py-0.2 bg-white text-black font-mono font-bold text-[10px] tracking-widest uppercase">
              {studentCourse} КУРС
            </span>
            {profile?.isTelegramAuth && (
              <span className="px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-mono text-[9px]">
                ● АВТОРИЗОВАНО
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setCourseScope(courseScope === 'my_group' ? 'all' : 'my_group');
              setSelectedSubject('ALL');
              triggerHaptic('selection');
            }}
            className={`px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase border transition-colors ${
              courseScope === 'my_group'
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900 text-zinc-400 border-white/20 hover:text-white'
            }`}
          >
            {courseScope === 'my_group' ? `МОЙ ${studentCourse} КУРС (${scopedLectures.length})` : `ВСЕ КУРСЫ (${REAL_LECTURES.length})`}
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
              БАЗА ЗНАНИЙ // АРХИВ МАТЕРИАЛОВ
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {courseScope === 'my_group' 
                ? `МАТЕРИАЛЫ ДЛЯ ГРУППЫ ${studentGroup} (${studentCourse} КУРС)` 
                : 'ВСЕ МАТЕРИАЛЫ И КОНСПЕКТЫ КОЛЛЕДЖА'}
            </h3>
          </div>
          <span className="font-mono text-[10px] tracking-wider text-zinc-400 border border-white/15 px-2 py-0.5 uppercase">
            {scopedLectures.length} МАТЕРИАЛОВ
          </span>
        </div>

        {/* Study Progress Meter */}
        <div className="space-y-1.5 pt-0.5 font-mono text-[10px]">
          <div className="flex justify-between text-zinc-400">
            <span>ПРОГРЕСС ИЗУЧЕНИЯ</span>
            <span className="text-white font-bold">{courseReadCount} ИЗ {scopedLectures.length} ({studyProgress}%)</span>
          </div>
          <div className="w-full h-1 bg-zinc-900 border border-white/10 overflow-hidden">
            <div className="h-full bg-white transition-all duration-500" style={{ width: `${studyProgress}%` }} />
          </div>
        </div>

        {/* Search Bar */}
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="СКВОЗНОЙ ПОИСК: ТЕРМИН, СТАТЬЯ УК/КОАП, ГОСТ, ФОРМУЛА..."
              className="w-full pl-9 pr-8 py-2 bg-black border border-white/10 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-mono"
              >
                [X]
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1">
            <span>⚡️ ПОЛНОТЕКСТОВЫЙ ПОИСК ПО ВСЕМ КОНСПЕКТАМ</span>
            {search.trim().length > 0 && (
              <span className="text-amber-400 font-bold">
                {filteredLectures.length} {filteredLectures.length === 1 ? 'СОВПАДЕНИЕ' : 'СОВПАДЕНИЙ'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
        {subjects.map(subj => (
          <button
            key={subj.code}
            onClick={() => {
              setSelectedSubject(subj.code);
              triggerHaptic('selection');
            }}
            className={`px-3 py-1.5 whitespace-nowrap font-mono text-[11px] font-bold tracking-wider transition-colors uppercase ${
              selectedSubject === subj.code
                ? 'bg-white text-black'
                : 'bg-[#0a0a0c] text-zinc-400 border border-white/10 hover:text-white'
            }`}
          >
            {subj.name}
          </button>
        ))}
      </div>

      {/* Lectures List */}
      <div className="space-y-3">
        {filteredLectures.map(lec => {
          const isFav = favorites.includes(lec.id);
          const isRead = readLectures.includes(lec.id);

          return (
            <div
              key={lec.id}
              className={`p-4 bg-[#0a0a0c] border space-y-3 transition-all ${
                isFav ? 'border-white/30' : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Meta Row */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 flex-wrap gap-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[11px] font-bold text-white tracking-wider uppercase">
                    [{lec.subject}] · {lec.teacher}
                  </span>
                  <span className="font-mono text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 uppercase font-bold border border-white/10">
                    {lec.course || 4} КУРС
                  </span>
                  {(lec.course === studentCourse || lec.courses?.includes(studentCourse)) && (
                    <span className="font-mono text-[9px] bg-emerald-950/90 text-emerald-300 px-1.5 py-0.2 uppercase font-bold border border-emerald-500/30">
                      ● ВАША ПРОГРАММА
                    </span>
                  )}
                  {isRead && (
                    <span className="font-mono text-[9px] bg-zinc-900 text-zinc-400 px-1 py-0.2 uppercase font-bold">
                      ИЗУЧЕНО
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-500 tracking-wider">
                    {lec.date} {lec.pair && `// ${lec.pair}`}
                  </span>
                  <button
                    onClick={(e) => toggleFavorite(lec.id, e)}
                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                    title={isFav ? "Удалить из избранного" : "Добавить в избранное"}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-white text-white' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h4 className="font-bold text-sm text-white tracking-tight leading-snug">
                {lec.title}
              </h4>

              {/* TL;DR Synopsis */}
              <div className="border-l-2 border-white/30 pl-3 py-1 bg-white/[0.02] space-y-1">
                <div className="font-mono text-[9px] tracking-widest text-zinc-500 uppercase">
                  ВЫЖИМКА // КЛЮЧЕВЫЕ ТЕЗИСЫ
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {lec.summary}
                </p>
              </div>

              {/* Full-text search match snippet */}
              {search.trim().length >= 2 && lec.snippet && (
                <div className="p-2.5 bg-zinc-950 border border-amber-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] text-amber-400 font-bold uppercase">
                    <Search className="w-3 h-3" />
                    <span>НАЙДЕНО В ТЕКСТЕ КОНСПЕКТА:</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-300 leading-relaxed">
                    {renderHighlightedText(lec.snippet, search)}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs font-mono">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => toggleRead(lec.id, e)}
                    className={`px-2 py-1 text-[10px] tracking-wider uppercase border transition-colors flex items-center gap-1 ${
                      isRead 
                        ? 'bg-zinc-900 border-white/30 text-white' 
                        : 'border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  >
                    <CheckCircle className={`w-3 h-3 ${isRead ? 'text-white' : 'text-zinc-600'}`} />
                    <span>{isRead ? 'ИЗУЧЕНО' : 'ОТМЕТИТЬ'}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(lec.id, lec.content || lec.summary)}
                    className="px-2 py-1 border border-white/10 hover:border-white text-zinc-400 hover:text-white text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1"
                  >
                    {copiedId === lec.id ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === lec.id ? 'СКОПИРОВАНО' : 'КОПИРОВАТЬ'}</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setActiveLectureModal(lec);
                    triggerHaptic('light');
                  }}
                  className="px-2.5 py-1 bg-white text-black font-bold text-[10px] tracking-wider uppercase hover:bg-zinc-200 transition-colors flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>ЧИТАТЬ МАТЕРИАЛ</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredLectures.length === 0 && (
          <div className="p-8 border border-neutral-800 bg-[#0a0a0c] text-center space-y-2 font-mono">
            <div className="text-xs text-white uppercase tracking-wider font-bold">
              {selectedSubject === 'FAV' ? 'НЕТ ИЗБРАННЫХ КОНСПЕКТОВ' : 'МАТЕРИАЛЫ НЕ НАЙДЕНЫ'}
            </div>
            <p className="text-[11px] text-zinc-500 font-sans max-w-xs mx-auto">
              {selectedSubject === 'FAV' 
                ? 'Нажмите на звёздочку ★ у любой лекции, чтобы добавить её в избранное для быстрой подготовки к экзаменам.' 
                : 'Попробуйте изменить поисковый запрос или выбрать другой предмет.'}
            </p>
          </div>
        )}
      </div>

      {/* Reader Modal */}
      {activeLectureModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn"
          onClick={() => setActiveLectureModal(null)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0e0e11] border border-neutral-800 p-5 space-y-4 font-mono max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-white tracking-wider uppercase">
                КОНСПЕКТ // {activeLectureModal.subject}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(activeLectureModal.id)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <Star className={`w-3.5 h-3.5 ${favorites.includes(activeLectureModal.id) ? 'fill-white text-white' : ''}`} />
                </button>
                <button 
                  onClick={() => setActiveLectureModal(null)}
                  className="text-xs text-neutral-400 hover:text-white px-1.5 py-0.5 border border-neutral-700"
                >
                  [X]
                </button>
              </div>
            </div>

            {/* Lecture Meta */}
            <div className="space-y-1">
              <div className="text-[10px] text-neutral-500 uppercase">
                {activeLectureModal.date} {activeLectureModal.pair && `· ${activeLectureModal.pair}`} · {activeLectureModal.teacher}
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                {activeLectureModal.title}
              </h3>
            </div>

            {/* Key Takeaways */}
            {activeLectureModal.key_points && activeLectureModal.key_points.length > 0 && (
              <div className="p-3 bg-black border border-neutral-800 space-y-1.5 text-xs">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  КЛЮЧЕВЫЕ ТЕЗИСЫ И СТАНДАРТЫ
                </div>
                <ul className="space-y-1 text-zinc-300 font-sans text-xs">
                  {activeLectureModal.key_points.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-white font-mono">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Search Match Info inside Modal */}
            {search.trim().length >= 2 && (activeLectureModal.content?.toLowerCase().includes(search.toLowerCase()) || activeLectureModal.title?.toLowerCase().includes(search.toLowerCase())) && (
              <div className="p-2 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center justify-between">
                <span>🔎 В конспекте найден поисковый запрос: «{search}»</span>
                <span className="px-1.5 py-0.2 bg-amber-400 text-black font-bold text-[9px]">НАЙДЕНО</span>
              </div>
            )}

            {/* Full Content */}
            <div className="p-4 bg-[#07080a] border border-neutral-800 text-xs font-sans text-zinc-200 leading-relaxed max-h-[55vh] overflow-y-auto">
              <MarkdownViewer 
                content={activeLectureModal.content || activeLectureModal.summary} 
                searchQuery={search}
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800 text-xs font-mono">
              <div className="flex gap-2">
                <button
                  onClick={() => toggleRead(activeLectureModal.id)}
                  className={`px-3 py-1.5 text-[10px] tracking-wider uppercase border flex items-center gap-1.5 ${
                    readLectures.includes(activeLectureModal.id)
                      ? 'bg-zinc-900 border-white text-white font-bold'
                      : 'border-white/20 text-zinc-400 hover:text-white'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>{readLectures.includes(activeLectureModal.id) ? 'ИЗУЧЕНО ✓' : 'ОТМЕТИТЬ КАК ИЗУЧЕННОЕ'}</span>
                </button>

                <button
                  onClick={() => handleDownloadMd(activeLectureModal)}
                  className="px-2.5 py-1.5 border border-white/20 hover:border-white text-zinc-300 hover:text-white text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>СКАЧАТЬ .MD</span>
                </button>
              </div>

              <button
                onClick={() => setActiveLectureModal(null)}
                className="px-4 py-1.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors"
              >
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
