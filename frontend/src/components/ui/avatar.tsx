import { cn } from '@/lib/cn';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-tint font-semibold text-primary-dark',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
