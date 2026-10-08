import { ButtonHTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/*
 * design.md: the pill is the only button shape. Primary is a solid ink pill that lifts to
 * shade-70 when pressed; secondary is the outline pill; "accent" is the aloe featured pill.
 */
const VARIANT_CLASSES: Record<string, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-dark active:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-transparent text-text border border-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed',
  accent:
    'bg-primary-tint text-text hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-muted hover:bg-black/[0.04] hover:text-text dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-transparent text-danger border border-danger/40 hover:bg-danger-bg disabled:opacity-50 disabled:cursor-not-allowed',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-xs px-4 py-2 gap-1.5',
  // 44px tall on touch screens, a little tighter on desktop.
  md: 'text-sm px-6 py-3 gap-2 min-h-11 sm:min-h-0 sm:py-2.5',
};

const BASE = 'inline-flex items-center justify-center rounded-full font-[550] transition-colors';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)} {...props} />;
});

interface LinkButtonProps {
  href: string;
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  children: React.ReactNode;
}

export function LinkButton({ href, variant = 'primary', size = 'md', className, children }: LinkButtonProps) {
  return (
    <Link href={href} className={cn(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}>
      {children}
    </Link>
  );
}
