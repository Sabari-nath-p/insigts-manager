import { cn } from '@/lib/cn';

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('thin-scrollbar overflow-x-auto', className)}>{children}</div>;
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>;
}

export function Thead({ children, sticky = false }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <thead className={cn(sticky && 'sticky top-0 z-10 bg-bg')}>
      <tr className="border-b border-border">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <th
      className={cn(
        'py-2 px-3 text-[11px] font-medium uppercase tracking-wide text-muted',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'group border-b border-border last:border-b-0 transition-colors',
        'hover:bg-black/[0.025] dark:hover:bg-white/[0.04]',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'py-2.5 px-3 align-middle',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-sm text-muted">{children}</p>;
}
