import { cn } from '@/lib/cn';

/** Vertical stack of label/value rows, Notion "page properties" style. */
export function PropertyList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-border', className)}>{children}</div>;
}

export function PropertyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <div className="w-40 shrink-0 text-sm text-muted">{label}</div>
      <div className="text-sm text-text">{value}</div>
    </div>
  );
}

/** Horizontal strip of compact metrics, used instead of bordered stat-card grids. */
export function MetricStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap divide-x divide-border rounded-md border border-border', className)}>
      {children}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[7.5rem] flex-1 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text">{value}</div>
    </div>
  );
}
