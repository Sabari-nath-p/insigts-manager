import { ButtonHTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const VARIANT_CLASSES: Record<string, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-transparent text-text border border-border hover:bg-black/[0.03] dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-transparent text-danger border border-danger/30 hover:bg-danger-bg disabled:opacity-50 disabled:cursor-not-allowed',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-[18px] py-[10px] gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
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
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
