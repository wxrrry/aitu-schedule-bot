import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, Code2, Copy, Check, Eye, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

// Singleton loader for Mermaid library (code-split)
let mermaidInstance = null;
let mermaidLoadingPromise = null;

async function getMermaid() {
  if (mermaidInstance) return mermaidInstance;
  if (!mermaidLoadingPromise) {
    mermaidLoadingPromise = import('mermaid').then(m => {
      const mermaid = m.default || m;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis'
        },
        themeVariables: {
          darkMode: true,
          background: '#090b0e',
          mainBkg: '#121827',
          primaryColor: '#1e293b',
          primaryBorderColor: '#38bdf8',
          primaryTextColor: '#f1f5f9',
          lineColor: '#38bdf8',
          secondaryColor: '#1e293b',
          secondaryBorderColor: '#818cf8',
          secondaryTextColor: '#f1f5f9',
          tertiaryColor: '#0f172a',
          tertiaryBorderColor: '#475569',
          tertiaryTextColor: '#e2e8f0',
          textColor: '#f8fafc',
          nodeBorder: '#38bdf8',
          clusterBkg: '#0a0f1d',
          clusterBorder: '#334155',
          defaultLinkColor: '#38bdf8',
          titleColor: '#38bdf8',
          edgeLabelBackground: '#1e293b',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      });
      mermaidInstance = mermaid;
      return mermaid;
    });
  }
  return mermaidLoadingPromise;
}

export default function MermaidBlock({ code }) {
  const [svgContent, setSvgContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code'
  const [isZoomed, setIsZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const renderChart = async () => {
      if (!code || !code.trim()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Generate a clean valid DOM ID
      const chartId = 'mmd_' + Math.random().toString(36).substring(2, 10);

      try {
        const mermaid = await getMermaid();
        const { svg } = await mermaid.render(chartId, code.trim());
        if (!cancelled) {
          setSvgContent(svg);
          setLoading(false);
        }
      } catch (err) {
        // Clean up any dangling temporary elements mermaid may have placed into body
        const dangling = document.getElementById(chartId);
        if (dangling) dangling.remove();
        const dDangling = document.getElementById('d' + chartId);
        if (dDangling) dDangling.remove();

        console.warn('Mermaid rendering failed:', err);
        if (!cancelled) {
          setError(err?.message || 'Не удалось отрисовать диаграмму');
          setLoading(false);
          setActiveTab('code'); // Switch to code view if render fails
        }
      }
    };

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    triggerHaptic('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTab = (tab) => {
    setActiveTab(tab);
    triggerHaptic('selection');
  };

  const toggleZoom = () => {
    setIsZoomed(prev => !prev);
    triggerHaptic('selection');
  };

  return (
    <div className="my-3 rounded-xs border border-white/10 bg-[#090b0e] overflow-hidden font-mono text-xs shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-white/[0.08] text-[10px] gap-2">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider min-w-0">
          <GitBranch className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">MERMAID СХЕМА</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle Preview / Code buttons */}
          <div className="flex items-center bg-white/[0.05] p-0.5 rounded-xs border border-white/10">
            <button
              onClick={() => toggleTab('preview')}
              className={`px-2 py-0.5 rounded-xs flex items-center gap-1 transition-colors ${
                activeTab === 'preview'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Визуальная схема"
            >
              <Eye className="w-2.5 h-2.5" />
              <span>СХЕМА</span>
            </button>
            <button
              onClick={() => toggleTab('code')}
              className={`px-2 py-0.5 rounded-xs flex items-center gap-1 transition-colors ${
                activeTab === 'code'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Исходный код Mermaid"
            >
              <Code2 className="w-2.5 h-2.5" />
              <span>КОД</span>
            </button>
          </div>

          {/* Zoom toggle button when viewing preview */}
          {activeTab === 'preview' && !loading && !error && (
            <button
              onClick={toggleZoom}
              className={`px-2 py-0.5 rounded-xs border transition-colors flex items-center gap-1 ${
                isZoomed 
                  ? 'bg-white/15 text-white border-white/30' 
                  : 'text-zinc-400 hover:text-white border-white/10 hover:border-white/20'
              }`}
              title={isZoomed ? "Масштабировать по экрану" : "Оригинальный масштаб 100%"}
            >
              {isZoomed ? <ZoomOut className="w-2.5 h-2.5" /> : <ZoomIn className="w-2.5 h-2.5" />}
              <span className="hidden sm:inline">{isZoomed ? 'ВПИСАТЬ' : '100%'}</span>
            </button>
          )}

          {/* Copy code button */}
          <button
            onClick={handleCopy}
            className="text-zinc-400 hover:text-white px-2 py-0.5 rounded-xs border border-white/10 hover:border-white/30 transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            <span>{copied ? 'СКОПИРОВАНО' : 'КОПИЯ'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'preview' ? (
        <div className="p-3 bg-[#0a0d14]/70">
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-cyan-400 font-mono text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="tracking-wider uppercase text-[10px]">Отрисовка схемы Mermaid...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xs text-rose-300 font-sans text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold font-mono text-[11px] text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>ОШИБКА РЕНДЕРИНГА СХЕМЫ</span>
              </div>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                Схема не может быть отображена графически. Вы можете изучить ее структуру во вкладке «КОД».
              </p>
            </div>
          )}

          {!loading && !error && svgContent && (
            <div className="relative">
              <div 
                ref={containerRef}
                className="overflow-x-auto overflow-y-hidden py-2 px-1 rounded-xs flex justify-center scrollbar-thin"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div 
                  className={`mermaid-rendered-wrapper flex justify-center transition-all duration-150 [&_.label]:text-zinc-100 [&_span]:text-zinc-100 ${
                    isZoomed 
                      ? 'min-w-max [&>svg]:!max-w-none [&>svg]:w-auto' 
                      : 'w-full max-w-full [&>svg]:w-full [&>svg]:h-auto'
                  }`}
                  dangerouslySetInnerHTML={{ __html: svgContent }} 
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1 select-none">
                <span className="flex items-center gap-1">
                  <span>↔</span> Прокручивайте по горизонтали
                </span>
                <span>Нажмите «100%» для крупного масштаба</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <pre className="p-3 text-[11px] leading-relaxed overflow-x-auto text-zinc-300 font-mono bg-[#090b0e]">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
