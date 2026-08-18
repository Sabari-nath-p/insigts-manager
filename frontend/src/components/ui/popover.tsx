'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/cn';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  children,
  align = 'start',
  className,
}: {
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 rounded-md border border-border bg-surface p-3 shadow-lg outline-none',
          className,
        )}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
