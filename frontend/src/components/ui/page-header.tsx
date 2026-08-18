import type { LucideIcon } from 'lucide-react';
import { IconTile, type TileTone } from './icon-tile';

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
  tone,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  tone?: TileTone;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <IconTile icon={icon} tone={tone} size="lg" className="mt-0.5" />}
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-text">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-10 flex items-center justify-between first:mt-0">
      <h2 className="text-sm font-semibold text-text">{children}</h2>
      {action}
    </div>
  );
}
