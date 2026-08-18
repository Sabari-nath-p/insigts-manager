import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TileTone = 'purple' | 'pink' | 'orange' | 'teal' | 'green' | 'sky' | 'gray';

const TONE_VARS: Record<TileTone, { bg: string; text: string }> = {
  purple: { bg: 'var(--tile-purple-bg)', text: 'var(--tile-purple-text)' },
  pink: { bg: 'var(--tile-pink-bg)', text: 'var(--tile-pink-text)' },
  orange: { bg: 'var(--tile-orange-bg)', text: 'var(--tile-orange-text)' },
  teal: { bg: 'var(--tile-teal-bg)', text: 'var(--tile-teal-text)' },
  green: { bg: 'var(--tile-green-bg)', text: 'var(--tile-green-text)' },
  sky: { bg: 'var(--tile-sky-bg)', text: 'var(--tile-sky-text)' },
  gray: { bg: 'var(--tile-gray-bg)', text: 'var(--tile-gray-text)' },
};

/** Notion-style colored icon tile — used next to page titles for a page-icon feel. */
export function IconTile({
  icon: Icon,
  tone = 'purple',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: TileTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const colors = TONE_VARS[tone];
  const sizeClasses = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-lg', sizeClasses, className)}
      style={{ background: colors.bg, color: colors.text }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}
