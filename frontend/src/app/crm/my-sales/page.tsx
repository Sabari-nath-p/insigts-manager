import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { EmptyState } from '@/components/ui/table';
import { AGING_LABELS, formatCurrency } from '@/lib/crm-format';
import type { Lead } from '../types';

interface MySales {
  myLeadsCount: number;
  myMeetingsCount: number;
  myCallsTaken: number;
  myOffers: number;
  mySalesCount: number;
  myFollowUpsCount: number;
  myRevenue: number;
  myCommission: number;
  myCloseRate: number;
  myShowUpRate: number;
  myAgingLeads: Lead[];
}

export default async function MySalesPage() {
  const { token, user } = await requireSession();
  const data = await apiFetch<MySales>('/crm/my-sales', { token });

  return (
    <AppShell user={user}>
      <PageHeader title="My Sales" icon={Wallet} tone="green" subtitle="Your own leads, meetings, sales and commission." />

      <MetricStrip className="mb-8">
        <Metric label="My leads" value={data.myLeadsCount} />
        <Metric label="My meetings" value={data.myMeetingsCount} />
        <Metric label="My calls taken" value={data.myCallsTaken} />
        <Metric label="My offers" value={data.myOffers} />
        <Metric label="My sales" value={data.mySalesCount} />
        <Metric label="My follow-ups" value={data.myFollowUpsCount} />
        <Metric label="My close rate" value={`${data.myCloseRate}%`} />
        <Metric label="My show-up rate" value={`${data.myShowUpRate}%`} />
      </MetricStrip>

      <SectionTitle>Revenue &amp; commission</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="My revenue" value={formatCurrency(data.myRevenue)} />
        <Metric label="My commission" value={formatCurrency(data.myCommission)} />
      </MetricStrip>

      <SectionTitle>My aging leads ({data.myAgingLeads.length})</SectionTitle>
      {data.myAgingLeads.length === 0 ? (
        <EmptyState>Nothing needs attention right now.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {data.myAgingLeads.map((l) => (
            <Link
              key={l.id}
              href={`/crm/leads/${l.id}`}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-primary/40"
            >
              <span className="font-medium text-text">{l.leadName}</span>
              <span className="text-xs font-medium text-danger">{l.agingStatus && AGING_LABELS[l.agingStatus]}</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
