'use client';

import { useRef, useState } from 'react';
import MarkdownContent from './MarkdownContent';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  minHeight?: number;
}

// ─── Toolbar definitions ──────────────────────────────────────────────────────

interface ToolbarAction {
  label: string;
  title: string;
  // wrap: [prefix, suffix] — wraps selection or inserts with placeholder
  wrap?: [string, string];
  // line: prefix added to the start of each selected line
  line?: string;
  // block: replaces entire selection with a block template
  block?: string;
}

const TOOLBAR: (ToolbarAction | 'sep')[] = [
  { label: 'H2',   title: 'Заголовок 2',        line: '## ' },
  { label: 'H3',   title: 'Заголовок 3',        line: '### ' },
  'sep',
  { label: 'B',    title: 'Жирний',             wrap: ['**', '**'] },
  { label: 'I',    title: 'Курсив',             wrap: ['*', '*'] },
  'sep',
  { label: '❝',    title: 'Цитата',             line: '> ' },
  { label: '•',    title: 'Маркований список',  line: '- ' },
  { label: '1.',   title: 'Нумерований список', line: '1. ' },
  'sep',
  { label: '`',    title: 'Inline-код',         wrap: ['`', '`'] },
  { label: '```',  title: 'Блок коду',          block: '```\n{selection}\n```' },
  'sep',
  { label: '🔗',   title: 'Посилання',          wrap: ['[', '](url)'] },
  { label: '—',    title: 'Горизонтальна лінія', block: '\n---\n' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyAction(
  textarea: HTMLTextAreaElement,
  action: ToolbarAction,
  value: string,
  onChange: (v: string) => void,
) {
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after  = value.slice(end);

  let newValue = value;
  let newCursorStart = start;
  let newCursorEnd   = end;

  if (action.block !== undefined) {
    const block = action.block.replace('{selection}', selected || 'код');
    newValue = before + block + after;
    newCursorStart = start + block.length;
    newCursorEnd   = newCursorStart;

  } else if (action.line !== undefined) {
    const prefix = action.line;
    if (selected) {
      // Apply prefix to every selected line
      const lines = selected.split('\n');
      const replaced = lines.map((l) => prefix + l).join('\n');
      newValue = before + replaced + after;
      newCursorStart = start;
      newCursorEnd   = start + replaced.length;
    } else {
      // Find start of current line
      const lineStart = before.lastIndexOf('\n') + 1;
      const linePrefix = value.slice(lineStart, start);
      if (linePrefix.startsWith(prefix)) {
        // Toggle off
        newValue = value.slice(0, lineStart) + linePrefix.slice(prefix.length) + value.slice(start);
        newCursorStart = start - prefix.length;
        newCursorEnd   = newCursorStart;
      } else {
        newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
        newCursorStart = start + prefix.length;
        newCursorEnd   = newCursorStart;
      }
    }

  } else if (action.wrap !== undefined) {
    const [pre, suf] = action.wrap;
    const placeholder = selected || 'текст';
    newValue = before + pre + placeholder + suf + after;
    newCursorStart = start + pre.length;
    newCursorEnd   = newCursorStart + placeholder.length;
  }

  onChange(newValue);

  // Restore focus + cursor after state update
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorStart, newCursorEnd);
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--text-dim)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tabs: {
    display: 'flex',
    gap: 2,
  },
  tabBtn: (active: boolean): React.CSSProperties => ({
    padding: '4px 14px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#111' : 'var(--text-muted)',
    fontWeight: active ? 700 : 400,
    fontSize: 12,
    cursor: 'pointer',
  }),
  editorBox: {
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden' as const,
    background: 'var(--bg-card)',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 2,
    padding: '8px 10px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.02)',
  },
  toolBtn: {
    padding: '3px 9px',
    borderRadius: 5,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-dim)',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    lineHeight: 1.4,
    userSelect: 'none' as const,
  },
  toolSep: {
    width: 1,
    background: 'var(--border)',
    margin: '3px 4px',
    alignSelf: 'stretch' as const,
  },
  textarea: (minH: number): React.CSSProperties => ({
    width: '100%',
    minHeight: minH,
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 1.7,
    resize: 'vertical',
    boxSizing: 'border-box',
  }),
  previewBox: (minH: number): React.CSSProperties => ({
    minHeight: minH,
    padding: '20px 24px',
    fontSize: 15,
    lineHeight: 1.8,
    overflowY: 'auto',
  }),
  emptyPreview: {
    color: 'var(--text-muted)',
    fontStyle: 'italic' as const,
    fontSize: 14,
    padding: '40px 24px',
    textAlign: 'center' as const,
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 6,
    lineHeight: 1.5,
  },
  error: {
    marginTop: 6,
    padding: '8px 12px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 6,
    fontSize: 12,
    color: '#ef4444',
  },
  cheatToggle: {
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    marginTop: 6,
  },
  cheatSheet: {
    marginTop: 8,
    padding: '12px 16px',
    background: 'rgba(139,92,246,0.05)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.8,
    fontFamily: 'monospace',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarkdownEditor({
  value,
  onChange,
  label,
  error,
  placeholder = 'Почніть писати markdown…',
  minHeight = 320,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [cheatOpen, setCheatOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div style={S.wrapper}>
      {/* Label row + tabs */}
      <div style={S.labelRow}>
        {label && <span style={S.label}>{label}</span>}
        <div style={S.tabs}>
          <button type="button" style={S.tabBtn(tab === 'edit')}   onClick={() => setTab('edit')}>   ✏️ Редагувати</button>
          <button type="button" style={S.tabBtn(tab === 'preview')} onClick={() => setTab('preview')}>👁 Перегляд</button>
        </div>
      </div>

      {/* Editor box */}
      <div style={S.editorBox}>

        {/* Toolbar — visible only in edit mode */}
        {tab === 'edit' && (
          <div style={S.toolbar} aria-label="Markdown toolbar">
            {TOOLBAR.map((item, i) => {
              if (item === 'sep') return <div key={i} style={S.toolSep} />;
              return (
                <button
                  key={i}
                  type="button"
                  title={item.title}
                  style={S.toolBtn}
                  onMouseDown={(e) => {
                    // Prevent textarea blur before we read selectionStart
                    e.preventDefault();
                    if (textareaRef.current) {
                      applyAction(textareaRef.current, item, value, onChange);
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Edit pane */}
        {tab === 'edit' && (
          <textarea
            ref={textareaRef}
            style={S.textarea(minHeight)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
          />
        )}

        {/* Preview pane */}
        {tab === 'preview' && (
          value.trim() ? (
            <div style={S.previewBox(minHeight)}>
              <MarkdownContent content={value} />
            </div>
          ) : (
            <div style={S.emptyPreview}>Почніть писати markdown…</div>
          )
        )}
      </div>

      {/* Hint + cheat sheet toggle */}
      <p style={S.hint}>
        Підтримується Markdown: заголовки, списки, посилання, цитати, таблиці, код.
        {' '}
        <button
          type="button"
          style={S.cheatToggle}
          onClick={() => setCheatOpen((v) => !v)}
        >
          {cheatOpen ? 'Сховати приклад' : 'Приклад синтаксису ↓'}
        </button>
      </p>

      {cheatOpen && (
        <div style={S.cheatSheet}>
          {`## Заголовок 2\n### Заголовок 3\n\n**жирний**  *курсив*  \`inline-код\`\n\n- елемент списку\n1. нумерований\n\n> цитата\n\n[посилання](https://example.com)\n\n\`\`\`\nблок коду\n\`\`\``}
        </div>
      )}

      {error && <div style={S.error}>{error}</div>}
    </div>
  );
}
