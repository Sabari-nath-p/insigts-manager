'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'records', label: 'Records' },
];

/**
 * Pure navigation control — no TabsContent here. Each tab's content is a different server-side
 * fetch (page.tsx only ever pulls the active tab's data), so switching tabs is a real navigation
 * (page=1, tab swapped) rather than client-side show/hide of already-fetched content.
 */
export function AttendanceTabNav({ tab }: { tab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={tab} onValueChange={goToTab}>
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
