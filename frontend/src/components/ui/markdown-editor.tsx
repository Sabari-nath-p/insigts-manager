'use client';

import { useRef } from 'react';
import { Bold, Italic, Heading2, List, ListOrdered, Link2, Table2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const TOOLBAR_BUTTON_CLASS =
  'flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-black/[0.04] hover:text-text dark:hover:bg-white/[0.06]';

function applyWrap(textarea: HTMLTextAreaElement, before: string, after: string = before) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  return { next, start: selectionStart + before.length, end: selectionStart + before.length + selected.length };
}

function applyLinePrefix(textarea: HTMLTextAreaElement, prefix: string) {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  return { next, start: selectionStart + prefix.length, end: selectionStart + prefix.length };
}

const TABLE_SNIPPET = '\n| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n';

export function MarkdownEditor({
  id,
  name,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function run(fn: (textarea: HTMLTextAreaElement) => { next: string; start: number; end: number }) {
    const textarea = ref.current;
    if (!textarea) return;
    const { next, start, end } = fn(textarea);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  }

  const actions: { icon: typeof Bold; label: string; onClick: () => void }[] = [
    { icon: Bold, label: 'Bold', onClick: () => run((t) => applyWrap(t, '**')) },
    { icon: Italic, label: 'Italic', onClick: () => run((t) => applyWrap(t, '*')) },
    { icon: Heading2, label: 'Heading', onClick: () => run((t) => applyLinePrefix(t, '## ')) },
    { icon: List, label: 'Bullet list', onClick: () => run((t) => applyLinePrefix(t, '- ')) },
    { icon: ListOrdered, label: 'Numbered list', onClick: () => run((t) => applyLinePrefix(t, '1. ')) },
    { icon: Link2, label: 'Link', onClick: () => run((t) => applyWrap(t, '[', '](https://)')) },
    {
      icon: Table2,
      label: 'Table',
      onClick: () =>
        run((t) => {
          const { selectionStart, value: v } = t;
          const next = v.slice(0, selectionStart) + TABLE_SNIPPET + v.slice(selectionStart);
          const cursor = selectionStart + TABLE_SNIPPET.length;
          return { next, start: cursor, end: cursor };
        }),
    },
  ];

  return (
    <div className={cn('overflow-hidden rounded-md border border-border', className)}>
      <div className="flex items-center gap-0.5 border-b border-border bg-sidebar px-1.5 py-1">
        {actions.map(({ icon: Icon, label, onClick }) => (
          <button key={label} type="button" title={label} onClick={onClick} className={TOOLBAR_BUTTON_CLASS}>
            <Icon size={15} strokeWidth={2} />
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-64 w-full resize-y bg-surface px-3 py-2.5 font-mono text-sm text-text outline-none placeholder:text-muted"
      />
    </div>
  );
}
