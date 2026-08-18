import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

/** Renders stored Markdown (policies/SOPs) using the app's existing type scale — no
 * new typography plugin, just Tailwind classes matching page-header.tsx's conventions. */
export function MarkdownView({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 text-sm leading-relaxed text-text', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-4 text-xl font-bold text-text first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-4 text-lg font-semibold text-text first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 text-base font-semibold text-text first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed text-text">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-sm text-text">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 text-sm text-text">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted">{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary-dark">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted">{children}</th>,
          td: ({ children }) => <td className="border-b border-border px-3 py-2 align-top">{children}</td>,
          code: ({ children }) => (
            <code className="rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-xs text-text dark:bg-white/[0.08]">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
