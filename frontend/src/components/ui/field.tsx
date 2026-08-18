import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export function Field({
  label,
  htmlFor,
  children,
  className,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function FieldRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

const inputClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-primary';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputClasses, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cn(inputClasses, 'cursor-pointer', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(inputClasses, 'min-h-24 resize-y', className)} {...props} />;
  },
);

export function CheckboxLabel({ children, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { children: React.ReactNode }) {
  return (
    <label className={cn('flex items-center gap-2 text-sm text-text', className)}>
      <input type="checkbox" className="h-3.5 w-3.5 accent-[color:var(--color-primary)]" {...props} />
      {children}
    </label>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
      {children}
    </div>
  );
}
