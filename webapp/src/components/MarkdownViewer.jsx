import React, { useState } from 'react';
import { 
  Check, 
  Copy, 
  ExternalLink, 
  FileText, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  AlertOctagon, 
  Lightbulb, 
  BookOpen, 
  CheckSquare, 
  Sparkles, 
  Quote, 
  Bookmark, 
  Flame, 
  Code2, 
  File, 
  CornerDownRight,
  GitBranch
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

// Map callout types to their styling, icon, and title
const CALLOUT_CONFIG = {
  abstract: {
    icon: BookOpen,
    label: 'РЕЗЮМЕ // TL;DR',
    bg: 'bg-cyan-950/20 border-cyan-500/50 text-cyan-200',
    titleColor: 'text-cyan-300',
    borderColor: 'border-l-cyan-400'
  },
  summary: {
    icon: BookOpen,
    label: 'РЕЗЮМЕ',
    bg: 'bg-cyan-950/20 border-cyan-500/50 text-cyan-200',
    titleColor: 'text-cyan-300',
    borderColor: 'border-l-cyan-400'
  },
  tldr: {
    icon: BookOpen,
    label: 'TL;DR',
    bg: 'bg-cyan-950/20 border-cyan-500/50 text-cyan-200',
    titleColor: 'text-cyan-300',
    borderColor: 'border-l-cyan-400'
  },
  tip: {
    icon: Lightbulb,
    label: 'СОВЕТ / ПРАКТИКА',
    bg: 'bg-emerald-950/25 border-emerald-500/50 text-emerald-200',
    titleColor: 'text-emerald-300',
    borderColor: 'border-l-emerald-400'
  },
  hint: {
    icon: Lightbulb,
    label: 'ПОДСКАЗКА',
    bg: 'bg-emerald-950/25 border-emerald-500/50 text-emerald-200',
    titleColor: 'text-emerald-300',
    borderColor: 'border-l-emerald-400'
  },
  important: {
    icon: Flame,
    label: 'ВАЖНО',
    bg: 'bg-amber-950/30 border-amber-500/50 text-amber-200',
    titleColor: 'text-amber-300',
    borderColor: 'border-l-amber-400'
  },
  warning: {
    icon: AlertTriangle,
    label: 'ВНИМАНИЕ',
    bg: 'bg-orange-950/30 border-orange-500/50 text-orange-200',
    titleColor: 'text-orange-300',
    borderColor: 'border-l-orange-400'
  },
  caution: {
    icon: AlertTriangle,
    label: 'ОСТОРОЖНО',
    bg: 'bg-orange-950/30 border-orange-500/50 text-orange-200',
    titleColor: 'text-orange-300',
    borderColor: 'border-l-orange-400'
  },
  danger: {
    icon: AlertOctagon,
    label: 'ОПАСНОСТЬ / ОТВЕТСТВЕННОСТЬ',
    bg: 'bg-rose-950/30 border-rose-500/50 text-rose-200',
    titleColor: 'text-rose-300',
    borderColor: 'border-l-rose-500'
  },
  error: {
    icon: AlertOctagon,
    label: 'ОШИБКА',
    bg: 'bg-rose-950/30 border-rose-500/50 text-rose-200',
    titleColor: 'text-rose-300',
    borderColor: 'border-l-rose-500'
  },
  example: {
    icon: CheckSquare,
    label: 'ПРИМЕР',
    bg: 'bg-purple-950/25 border-purple-500/50 text-purple-200',
    titleColor: 'text-purple-300',
    borderColor: 'border-l-purple-400'
  },
  note: {
    icon: Info,
    label: 'ЗАМЕТКА',
    bg: 'bg-blue-950/25 border-blue-500/50 text-blue-200',
    titleColor: 'text-blue-300',
    borderColor: 'border-l-blue-400'
  },
  info: {
    icon: Info,
    label: 'ИНФОРМАЦИЯ',
    bg: 'bg-blue-950/25 border-blue-500/50 text-blue-200',
    titleColor: 'text-blue-300',
    borderColor: 'border-l-blue-400'
  },
  quote: {
    icon: Quote,
    label: 'ЦИТАТА',
    bg: 'bg-zinc-900/40 border-zinc-500/40 text-zinc-300',
    titleColor: 'text-zinc-400',
    borderColor: 'border-l-zinc-400'
  }
};

/**
 * Parses and formats inline text:
 * - [[Target|Alias]] and [[Target]] (Wikilinks)
 * - **bold**
 * - *italic*
 * - `code`
 * - $math$
 * - [text](url)
 * - query search highlights
 */
function renderInline(text, searchQuery, keyPrefix = '') {
  if (!text) return null;

  // Pattern matches:
  // 1. Wikilinks: [[target|alias]] or [[target]]
  // 2. Bold: **...**
  // 3. Italic: *...*
  // 4. Inline code: `...`
  // 5. Math: $...$
  // 6. External link: [text](url)
  const regex = /(\[\[(?:[^\]|]+)(?:\|[^\]]+)?\]\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\$[^$]+\$|\[[^\]]+\]\([^)]+\))/g;

  const parts = text.split(regex);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (!part) return null;

    // 1. Wikilink: [[Target|Alias]] or [[Target]]
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const raw = part.slice(2, -2);
      const splitIdx = raw.indexOf('|');
      const target = splitIdx !== -1 ? raw.slice(0, splitIdx).trim() : raw.trim();
      const alias = splitIdx !== -1 ? raw.slice(splitIdx + 1).trim() : target;
      const isFile = target.includes('.docx') || target.includes('.pdf') || target.includes('.xlsx') || target.includes('📁');

      return (
        <span 
          key={key}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-xs font-mono text-[10px] border transition-colors select-none ${
            isFile 
              ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:border-amber-400' 
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300 hover:border-indigo-400'
          }`}
          title={`Внутренняя ссылка: ${target}`}
        >
          {isFile ? <File className="w-2.5 h-2.5 text-amber-400 shrink-0" /> : <Bookmark className="w-2.5 h-2.5 text-indigo-400 shrink-0" />}
          <span className="font-medium underline decoration-dotted underline-offset-2">{alias}</span>
        </span>
      );
    }

    // 2. Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const content = part.slice(2, -2);
      return (
        <strong key={key} className="font-bold text-white">
          {renderInline(content, searchQuery, `${key}-b`)}
        </strong>
      );
    }

    // 3. Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const content = part.slice(1, -1);
      return (
        <em key={key} className="italic text-zinc-300">
          {renderInline(content, searchQuery, `${key}-i`)}
        </em>
      );
    }

    // 4. Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const content = part.slice(1, -1);
      return (
        <code key={key} className="px-1.5 py-0.5 mx-0.5 bg-zinc-900 text-amber-300 font-mono text-[11px] rounded-xs border border-white/10">
          {content}
        </code>
      );
    }

    // 5. Math formula: $formula$
    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const formula = part.slice(1, -1);
      return (
        <span key={key} className="px-1.5 py-0.5 mx-0.5 bg-emerald-950/40 text-emerald-300 font-mono text-[11px] rounded-xs border border-emerald-500/30 inline-flex items-center gap-1">
          <span className="text-[9px] text-emerald-500 italic">fx</span>
          <span>{formula}</span>
        </span>
      );
    }

    // 6. Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a 
          key={key}
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-0.5"
        >
          <span>{linkMatch[1]}</span>
          <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>
      );
    }

    // Regular text with optional search highlight
    if (searchQuery && searchQuery.trim().length >= 2) {
      const cleanQ = searchQuery.trim();
      const subParts = part.split(new RegExp(`(${cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return (
        <span key={key}>
          {subParts.map((sub, sIdx) => 
            sub.toLowerCase() === cleanQ.toLowerCase() ? (
              <mark key={sIdx} className="bg-amber-400 text-black px-1 font-bold rounded-xs not-italic">
                {sub}
              </mark>
            ) : (
              sub
            )
          )}
        </span>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

/**
 * Code Block Component with Copy functionality
 */
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    triggerHaptic('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const isMermaid = lang?.toLowerCase() === 'mermaid';

  return (
    <div className="my-3 rounded-xs border border-white/10 bg-[#090b0e] overflow-hidden font-mono text-xs shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-white/[0.08] text-[10px]">
        <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase tracking-wider">
          {isMermaid ? (
            <>
              <GitBranch className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-300">MERMAID ДИАГРАММА / СХЕМА</span>
            </>
          ) : (
            <>
              <Code2 className="w-3 h-3 text-amber-400" />
              <span>{lang || 'CODE'}</span>
            </>
          )}
        </div>
        <button
          onClick={handleCopyCode}
          className="text-zinc-400 hover:text-white px-2 py-0.5 rounded-xs border border-white/10 hover:border-white/30 transition-colors flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'СКОПИРОВАНО' : 'КОПИРОВАТЬ'}</span>
        </button>
      </div>

      <pre className="p-3 text-[11px] leading-relaxed overflow-x-auto text-zinc-300 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Callout (Admonition) Component
 */
function CalloutBlock({ type, title, lines, searchQuery }) {
  const normType = type?.toLowerCase() || 'note';
  const config = CALLOUT_CONFIG[normType] || CALLOUT_CONFIG.note;
  const Icon = config.icon;

  const displayTitle = title?.trim() || config.label;

  return (
    <div className={`my-3 p-3.5 border-l-4 border ${config.borderColor} ${config.bg} rounded-xs shadow-xs space-y-2 font-sans`}>
      <div className="flex items-center gap-2 font-mono">
        <Icon className={`w-4 h-4 shrink-0 ${config.titleColor}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${config.titleColor}`}>
          {displayTitle}
        </span>
      </div>
      <div className="text-xs leading-relaxed space-y-1.5 text-zinc-200">
        {lines.map((line, idx) => (
          <p key={idx}>{renderInline(line, searchQuery, `callout-${idx}`)}</p>
        ))}
      </div>
    </div>
  );
}

/**
 * Table Component
 */
function TableBlock({ headers, rows, searchQuery }) {
  return (
    <div className="my-3 overflow-x-auto rounded-xs border border-white/10 bg-black/60 shadow-sm">
      <table className="w-full text-left border-collapse text-xs font-sans min-w-[500px]">
        <thead>
          <tr className="bg-neutral-900/80 border-b border-white/15 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
            {headers.map((h, i) => (
              <th key={i} className="p-2.5 font-bold border-r border-white/10 last:border-r-0">
                {renderInline(h.trim(), searchQuery, `th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.08]">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2.5 text-zinc-300 text-[11px] leading-relaxed border-r border-white/5 last:border-r-0">
                  {renderInline(cell.trim(), searchQuery, `td-${rIdx}-${cIdx}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Main Markdown & Note Renderer Component
 */
export default function MarkdownViewer({ content, searchQuery = '' }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Block: ```lang ... ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <CodeBlock key={`code-${i}`} lang={lang} code={codeLines.join('\n')} />
      );
      i++;
      continue;
    }

    // 2. Callout / Admonition: > [!type] Title
    const calloutMatch = rawLine.match(/^>\s*\[!([a-zA-Z_-]+)\](.*)$/);
    if (calloutMatch) {
      const type = calloutMatch[1];
      const title = calloutMatch[2];
      const calloutLines = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() !== '' && calloutLines.length > 0 && !lines[i].startsWith('#')))) {
        if (lines[i].startsWith('>')) {
          calloutLines.push(lines[i].replace(/^>\s?/, ''));
        } else {
          break;
        }
        i++;
      }
      elements.push(
        <CalloutBlock 
          key={`callout-${i}`}
          type={type}
          title={title}
          lines={calloutLines}
          searchQuery={searchQuery}
        />
      );
      continue;
    }

    // 3. Regular Blockquote: > text
    if (rawLine.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={`quote-${i}`} className="my-2.5 pl-3 border-l-2 border-zinc-500 text-zinc-300 italic text-xs leading-relaxed space-y-1">
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInline(ql, searchQuery, `quote-${i}-${qIdx}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 4. Table: | col 1 | col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].includes('| ---')) {
      const headers = trimmed.slice(1, -1).split('|');
      i += 2; // skip header & separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowCells = lines[i].trim().slice(1, -1).split('|');
        rows.push(rowCells);
        i++;
      }
      elements.push(
        <TableBlock key={`table-${i}`} headers={headers} rows={rows} searchQuery={searchQuery} />
      );
      continue;
    }

    // 5. Horizontal Divider: --- or ***
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="border-t border-white/10 my-4" />);
      i++;
      continue;
    }

    // 6. Headers (# H1 to ###### H6)
    if (trimmed.startsWith('#')) {
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];

        switch (level) {
          case 1:
            elements.push(
              <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight pt-3 pb-1 border-b border-white/15 mt-3 mb-2">
                {renderInline(text, searchQuery, `h1-${i}`)}
              </h1>
            );
            break;
          case 2:
            elements.push(
              <h2 key={`h2-${i}`} className="text-lg font-bold text-white font-sans tracking-tight pt-2 pb-1 border-b border-white/10 mt-3 mb-1.5">
                {renderInline(text, searchQuery, `h2-${i}`)}
              </h2>
            );
            break;
          case 3:
            elements.push(
              <h3 key={`h3-${i}`} className="text-base font-bold text-amber-300 font-sans tracking-tight mt-3 mb-1">
                {renderInline(text, searchQuery, `h3-${i}`)}
              </h3>
            );
            break;
          case 4:
            elements.push(
              <h4 key={`h4-${i}`} className="text-sm font-bold text-zinc-100 font-sans tracking-wide mt-2.5 mb-1">
                {renderInline(text, searchQuery, `h4-${i}`)}
              </h4>
            );
            break;
          case 5:
            elements.push(
              <h5 key={`h5-${i}`} className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider mt-2 mb-1">
                {renderInline(text, searchQuery, `h5-${i}`)}
              </h5>
            );
            break;
          default:
            elements.push(
              <h6 key={`h6-${i}`} className="text-xs font-semibold text-zinc-400 font-mono mt-1.5 mb-0.5">
                {renderInline(text, searchQuery, `h6-${i}`)}
              </h6>
            );
        }
        i++;
        continue;
      }
    }

    // 7. Checkbox Task List: - [ ] or - [x]
    const taskMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const text = taskMatch[2];
      elements.push(
        <div key={`task-${i}`} className="flex items-start gap-2 my-1 text-xs font-sans">
          <div className={`w-3.5 h-3.5 mt-0.5 rounded-xs border flex items-center justify-center shrink-0 ${
            isChecked ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'border-zinc-500 bg-black/40'
          }`}>
            {isChecked && <Check className="w-2.5 h-2.5" />}
          </div>
          <span className={isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}>
            {renderInline(text, searchQuery, `task-${i}`)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Bullet List: - item or * item
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, '');
        listItems.push(itemText);
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-2 text-xs font-sans text-zinc-200">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 font-mono text-[10px] shrink-0 mt-0.5">•</span>
              <span className="leading-relaxed">{renderInline(item, searchQuery, `li-${i}-${idx}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 9. Numbered List: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const numItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const numMatch = lines[i].trim().match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          numItems.push({ num: numMatch[1], text: numMatch[2] });
        }
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-1 text-xs font-sans text-zinc-200">
          {numItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="font-mono text-amber-300 text-[10px] font-bold shrink-0 mt-0.5">
                {item.num}.
              </span>
              <span className="leading-relaxed">{renderInline(item.text, searchQuery, `ol-${i}-${idx}`)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 10. Empty lines
    if (trimmed === '') {
      i++;
      continue;
    }

    // 11. Normal Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-xs text-zinc-300 leading-relaxed font-sans">
        {renderInline(rawLine, searchQuery, `p-${i}`)}
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-1 select-text">
      {elements}
    </div>
  );
}
