'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 overflow-x-auto thin-scrollbar">
      <TabsPrimitive.List className="flex items-center gap-1 border-b border-border">{children}</TabsPrimitive.List>
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'relative -mb-px shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-muted outline-none transition-colors',
        'hover:text-text',
        'data-[state=active]:text-text',
        "data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-['']",
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export const TabsContent = TabsPrimitive.Content;
