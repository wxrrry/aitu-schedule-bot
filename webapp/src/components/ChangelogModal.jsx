import React from 'react';
import { CHANGELOG_STAGES, APP_CURRENT_VERSION } from '../data/changelogData';
import { useTelegramBackButton } from '../utils/telegram';
import { GitCommit, X, Clock } from 'lucide-react';

export default function ChangelogModal({ isOpen, onClose }) {
  useTelegramBackButton(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-mono"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#0e0e11] border border-neutral-800 p-5 space-y-4 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              ИСТОРИЯ ОБНОВЛЕНИЙ // ЧЕНДЖЛОГ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.2 uppercase">
              {APP_CURRENT_VERSION}
            </span>
            <button 
              onClick={onClose}
              className="text-xs text-neutral-400 hover:text-white px-1.5 py-0.5 border border-neutral-700"
            >
              [X]
            </button>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
          Хронология релизов и этапов развития цифрового хаба колледжа AITU. Все изменения выполнены в строгом монохромном стиле.
        </p>

        {/* Timeline of Stages */}
        <div className="space-y-4 pt-1">
          {CHANGELOG_STAGES.map((stage, idx) => (
            <div 
              key={stage.version}
              className={`p-4 border space-y-3 transition-all ${
                idx === 0 
                  ? 'bg-black border-white/30' 
                  : 'bg-[#0a0a0c] border-white/10'
              }`}
            >
              {/* Stage Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-zinc-900 border border-white/20 text-white font-bold text-xs">
                    {stage.version}
                  </span>
                  <span className="text-[10px] text-zinc-400 border border-white/15 px-1.5 py-0.2 uppercase font-bold">
                    {stage.tag}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Clock className="w-3 h-3" />
                  <span>{stage.date}</span>
                </div>
              </div>

              {/* Stage Title */}
              <h4 className="font-bold text-sm text-white font-sans tracking-tight leading-snug">
                {stage.title}
              </h4>

              {/* Items List */}
              <div className="space-y-2 pt-1">
                {stage.items.map((item, i) => (
                  <div key={i} className="text-xs space-y-0.5">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-white rounded-full" />
                      <span>{item.category}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed pl-2.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors"
        >
          ЗАКРЫТЬ ИСТОРИЮ
        </button>
      </div>
    </div>
  );
}
