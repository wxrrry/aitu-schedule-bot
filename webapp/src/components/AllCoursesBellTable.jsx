import React, { useState } from 'react';
import { PHOTO_BELL_MATRIX, COURSE_BELL_SCHEDULE, COURSE_LUNCH } from '../data/scheduleData';
import { triggerHaptic } from '../utils/telegram';
import { Table, Clock, Coffee, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function AllCoursesBellTable({ currentCourse = 4, className = "" }) {
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' (photo view) or 'detailed'
  const [expandedCourse, setExpandedCourse] = useState(currentCourse);

  return (
    <div className={`bg-neutral-900/70 border border-white/10 p-3.5 space-y-3 font-sans ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white" />
          <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
            ГРАФИК ЗВОНКОВ ПО ВСЕМ КУРСАМ
          </span>
        </div>
        <div className="flex items-center gap-1 bg-black/60 p-0.5 border border-white/10 rounded-xs">
          <button
            onClick={() => {
              setViewMode('matrix');
              triggerHaptic('selection');
            }}
            className={`px-2 py-0.5 font-mono text-[9px] uppercase transition-colors ${
              viewMode === 'matrix' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            СВОДНАЯ СЕТКА
          </button>
          <button
            onClick={() => {
              setViewMode('detailed');
              triggerHaptic('selection');
            }}
            className={`px-2 py-0.5 font-mono text-[9px] uppercase transition-colors ${
              viewMode === 'detailed' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            ПО КУРСАМ
          </button>
        </div>
      </div>

      {/* MATRIX VIEW (Exact replica of the college schedule photo) */}
      {viewMode === 'matrix' && (
        <div className="space-y-2">
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-center border-collapse text-[10px] font-mono min-w-[340px]">
              <thead>
                <tr className="border-b border-white/20 bg-black/60">
                  <th className="p-1.5 text-left text-zinc-500 font-bold uppercase text-[9px] w-14">
                    ПАРА
                  </th>
                  {[1, 2, 3, 4].map(c => (
                    <th 
                      key={c} 
                      className={`p-1.5 font-bold uppercase text-[10px] transition-colors ${
                        c === currentCourse 
                          ? 'bg-white/15 text-white border-b-2 border-white' 
                          : 'text-zinc-400'
                      }`}
                    >
                      {c} КУРС
                      {c === currentCourse && (
                        <span className="block text-[8px] text-emerald-400">● ВАШ</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-zinc-300">
                {/* 1 пара */}
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-1.5 text-left font-bold text-white align-middle bg-black/30">
                    1 пара
                  </td>
                  {[1, 2, 3, 4].map(c => (
                    <td key={c} className={`p-1.5 align-middle leading-tight ${c === currentCourse ? 'bg-white/[0.04]' : ''}`}>
                      <div className="text-zinc-200">9.00 - 9.45</div>
                      <div className="text-zinc-400 text-[9px]">9.50 - 10.35</div>
                    </td>
                  ))}
                </tr>

                {/* Обед 1 курса */}
                <tr className="bg-rose-950/20">
                  <td className="p-1 text-left text-[9px] text-rose-400 font-semibold bg-black/30">
                    обед
                  </td>
                  <td className="p-1 bg-rose-900/60 border border-rose-500/40 text-rose-200 font-bold text-[9px]">
                    обед 10.35 - 11.10
                  </td>
                  <td className="p-1 text-zinc-700 select-none">—</td>
                  <td className="p-1 text-zinc-700 select-none">—</td>
                  <td className="p-1 text-zinc-700 select-none">—</td>
                </tr>

                {/* 2 пара (верхняя часть) */}
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-1.5 text-left font-bold text-white align-middle bg-black/30" rowSpan={3}>
                    2 пара
                  </td>
                  {/* 1 курс: 11.10 - 11.55 и 12.00 - 12.45 */}
                  <td className={`p-1.5 align-middle leading-tight ${currentCourse === 1 ? 'bg-white/[0.04]' : ''}`} rowSpan={3}>
                    <div className="text-zinc-200">11.10 - 11.55</div>
                    <div className="text-zinc-400 text-[9px]">12.00 - 12.45</div>
                  </td>

                  {/* 2 курс: 1-я часть */}
                  <td className={`p-1.5 align-middle text-zinc-200 ${currentCourse === 2 ? 'bg-white/[0.04]' : ''}`}>
                    10.45 - 11.30
                  </td>

                  {/* 3 курс: 10.45-11.30 и 11.35-12.20 */}
                  <td className={`p-1.5 align-middle leading-tight ${currentCourse === 3 ? 'bg-white/[0.04]' : ''}`} rowSpan={2}>
                    <div className="text-zinc-200">10.45 - 11.30</div>
                    <div className="text-zinc-400 text-[9px]">11.35 - 12.20</div>
                  </td>

                  {/* 4 курс: 10.45-11.30 и 11.35-12.20 */}
                  <td className={`p-1.5 align-middle leading-tight ${currentCourse === 4 ? 'bg-white/[0.04]' : ''}`} rowSpan={2}>
                    <div className="text-zinc-200">10.45 - 11.30</div>
                    <div className="text-zinc-400 text-[9px]">11.35 - 12.20</div>
                  </td>
                </tr>

                {/* Обед 2 курса (внутри 2 пары) */}
                <tr className="bg-rose-950/20">
                  <td className="p-1 bg-rose-900/60 border border-rose-500/40 text-rose-200 font-bold text-[9px]">
                    обед 11.30 - 12.00
                  </td>
                </tr>

                {/* 2 курс окончание + Обед 3 и 4 курсов */}
                <tr>
                  {/* 2 курс (2-я часть) */}
                  <td className={`p-1.5 align-middle text-zinc-200 ${currentCourse === 2 ? 'bg-white/[0.04]' : ''}`}>
                    12.00 - 12.45
                  </td>

                  {/* 3 курс: обед */}
                  <td className="p-1 bg-rose-900/60 border border-rose-500/40 text-rose-200 font-bold text-[9px]">
                    обед 12.20 - 12.55
                  </td>

                  {/* 4 курс: обед */}
                  <td className="p-1 bg-rose-900/60 border border-rose-500/40 text-rose-200 font-bold text-[9px]">
                    обед 12.20 - 12.55
                  </td>
                </tr>

                {/* 3 пара */}
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-1.5 text-left font-bold text-white align-middle bg-black/30">
                    3 пара
                  </td>
                  {[1, 2, 3, 4].map(c => (
                    <td key={c} className={`p-1.5 align-middle leading-tight ${c === currentCourse ? 'bg-white/[0.04]' : ''}`}>
                      <div className="text-zinc-200">12.55 - 13.40</div>
                      <div className="text-zinc-400 text-[9px]">13.45 - 14.30</div>
                    </td>
                  ))}
                </tr>

                {/* 4 пара */}
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-1.5 text-left font-bold text-white align-middle bg-black/30">
                    4 пара
                  </td>
                  {[1, 2, 3, 4].map(c => (
                    <td key={c} className={`p-1.5 align-middle leading-tight ${c === currentCourse ? 'bg-white/[0.04]' : ''}`}>
                      <div className="text-zinc-200">14.40 - 15.25</div>
                      <div className="text-zinc-400 text-[9px]">15.30 - 16.15</div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 pt-1 font-mono text-[9px] text-zinc-400">
            <span className="w-2.5 h-2.5 bg-rose-900/70 border border-rose-500/40 inline-block flex-shrink-0" />
            <span>Красные блоки — фиксированное время обеденного перерыва каждого курса</span>
          </div>
        </div>
      )}

      {/* DETAILED ACCORDION VIEW */}
      {viewMode === 'detailed' && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(c => {
            const isExpanded = expandedCourse === c;
            const bells = COURSE_BELL_SCHEDULE[c];
            const lunch = COURSE_LUNCH[c];

            return (
              <div 
                key={c}
                className={`border transition-all ${
                  c === currentCourse 
                    ? 'border-white/30 bg-black/50' 
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <button
                  onClick={() => {
                    setExpandedCourse(isExpanded ? null : c);
                    triggerHaptic('light');
                  }}
                  className="w-full p-2 flex items-center justify-between text-left font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${c === currentCourse ? 'text-white' : 'text-zinc-300'}`}>
                      {c} КУРС
                    </span>
                    {c === currentCourse && (
                      <span className="text-[9px] bg-white text-black font-bold px-1 py-0.2 uppercase">
                        ВАШ КУРС
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-[10px]">
                    <span className="text-rose-400">Обед: {lunch.range}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-2.5 pt-0 space-y-1.5 border-t border-white/5 font-mono text-[10px] text-zinc-300">
                    <div className="text-[10px] text-rose-300 bg-rose-950/30 p-1.5 border border-rose-500/30">
                      ☕️ {lunch.desc}
                    </div>
                    {[1, 2, 3, 4].map(p => {
                      const b = bells[p];
                      return (
                        <div key={p} className="p-1.5 bg-neutral-900/70 border border-white/5 flex items-center justify-between">
                          <span className="font-bold text-white">{p} ПАРА</span>
                          <span className="text-zinc-400">{b.part1} • {b.part2}</span>
                          <span className="text-white font-medium">{b.range}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
