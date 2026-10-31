import { CalendarRange } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import type { CcCalendar, CcMe } from '@/lib/content-calendar/types';
import { ContentCalendarView } from './_components/content-calendar-view';

export const metadata = { title: 'Content Calendar | Insights' };

export default async function ContentCalendarPage() {
  const { token, user } = await requireSession();

  let me: CcMe | null = null;
  let calendars: CcCalendar[] = [];
  let problem = '';
  try {
    [me, calendars] = await Promise.all([apiFetch<CcMe>('/content-calendar/me', { token }), apiFetch<CcCalendar[]>('/content-calendar/calendars', { token })]);
  } catch (err) {
    problem = (err as Error).message;
  }

  return (
    <AppShell user={user} wide>
      <PageHeader
        title="Content Calendar"
        icon={CalendarRange}
        tone="purple"
      />
      {me ? (
        <ContentCalendarView initialCalendars={calendars} me={me} />
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <h2 className="text-[28px] leading-tight text-text" style={{ fontWeight: 330 }}>
            Content Calendar is not available yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{problem || 'Something went wrong.'} If you should have access, ask an admin.</p>
        </div>
      )}
    </AppShell>
  );
}
