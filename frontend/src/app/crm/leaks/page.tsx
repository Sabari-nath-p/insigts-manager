import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/table';
import type { Lead } from '../types';
import { formatCurrency } from '@/lib/crm-format';

interface SalesLeaks {
  bookingLag: Lead[];
  followUpAging: Lead[];
  depositAging: Lead[];
  noContact: Lead[];
  unworkedLeads: Lead[];
  noShowFollowUp: Lead[];
  proposalStagnation: Lead[];
}

const SECTIONS: Array<{ key: keyof SalesLeaks; title: string; description: string }> = [
  { key: 'followUpAging', title: 'Follow-Up Aging', description: 'Follow-Up Ongoing leads untouched for 7+ days.' },
  { key: 'depositAging', title: 'Deposit Aging', description: 'Deposits pending 14+ days.' },
  { key: 'bookingLag', title: 'Booking Lag', description: 'Meeting booked more than 4 days before the meeting date.' },
  { key: 'noContact', title: 'No Contact', description: 'New leads with no first contact recorded.' },
  { key: 'unworkedLeads', title: 'Unworked Leads', description: 'New leads with no activity at all.' },
  { key: 'noShowFollowUp', title: 'No-Show Follow-Up', description: 'Meeting marked No-Show with no follow-up scheduled.' },
  { key: 'proposalStagnation', title: 'Proposal Stagnation', description: 'Proposal-stage leads without recent activity.' },
];

export default async function SalesLeaksPage() {
  const { token, user } = await requireSession();
  const leaks = await apiFetch<SalesLeaks>('/crm/leaks', { token });

  return (
    <AppShell user={user}>
      <PageHeader title="Sales Leaks" icon={AlertTriangle} tone="pink" subtitle="Automatically detected pipeline risks — click through to fix them." />

      {SECTIONS.map(({ key, title, description }) => {
        const leads = leaks[key];
        return (
          <div key={key} className="mb-8">
            <SectionTitle>
              {title} <span className="ml-2 text-xs font-normal text-muted">({leads.length})</span>
            </SectionTitle>
            <p className="mb-3 text-xs text-muted">{description}</p>
            {leads.length === 0 ? (
              <EmptyState>Nothing here — good.</EmptyState>
            ) : (
              <div className="flex flex-col gap-2">
                {leads.map((l) => (
                  <Link
                    key={l.id}
                    href={`/crm/leads/${l.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <span>
                      <span className="font-medium text-text">{l.leadName}</span>
                      {l.companyName && <span className="ml-2 text-muted">{l.companyName}</span>}
                    </span>
                    {l.dealValue > 0 && <span className="text-muted">{formatCurrency(l.dealValue)}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </AppShell>
  );
}
