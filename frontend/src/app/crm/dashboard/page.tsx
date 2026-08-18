import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Field, Select, Input } from '@/components/ui/field';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { formatCurrency } from '@/lib/crm-format';
import type { SalesTeamMember } from '../types';

interface UserSummary {
  id: string;
  fullName: string;
}

interface DashboardData {
  pipeline: { totalLeads: number; counts: Record<string, number> };
  setterMetrics: { speedToLeadAvgMinutes: number | null; bookingLagAvgDays: number | null };
  meetingMetrics: {
    callsScheduled: number;
    callsTaken: number;
    noShows: number;
    cancels: number;
    rescheduled: number;
    dqs: number;
    showUpRate: number;
    dqRate: number;
  };
  closerMetrics: { offersMade: number; offerRate: number; totalSales: number; closeRate: number; closeRateOnOffers: number };
  saleTypeMetrics: {
    oneCallSales: { count: number; percentage: number };
    followUpSales: { count: number; percentage: number };
    totalSales: number;
  };
  dealMetrics: { averageDealSize: number; revenuePerCallTaken: number };
  lossAnalytics: Array<{ reason: string; count: number; percentage: number }>;
  followUpAging: { totalFollowUpDeals: number; d0_3: number; d4_6: number; d7_13: number; d14_plus: number };
  money: { totalDeposits: number; totalSales: number; revenueGenerated: number; cashCollected: number; refunds: number; netRevenue: number };
  paymentConversion: { depositToPaidInFullPercent: number; averageDaysToCollect: number | null };
}

interface CommissionRow {
  closerId: string;
  closerName: string;
  totalSales: number;
  revenue: number;
  refunds: number;
  netRevenue: number;
  commissionEarned: number;
  percent: number;
}

interface Filters {
  from?: string;
  to?: string;
  setterId?: string;
  closerId?: string;
}

const LOSS_LABELS: Record<string, string> = {
  price: 'Price',
  timing: 'Timing',
  partner_spouse: 'Partner / Spouse',
  competitor: 'Competitor',
  ghosted: 'Ghosted',
  not_qualified: 'Not Qualified',
  unspecified: 'Unspecified',
};

export default async function CrmDashboardPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { token, user } = await requireSession();
  const filters = await searchParams;
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) query.set(k, v);
  });

  const [dashboard, commissions, team, users] = await Promise.all([
    apiFetch<DashboardData>(`/crm/dashboard?${query.toString()}`, { token }),
    apiFetch<CommissionRow[]>('/crm/dashboard/commissions', { token }),
    apiFetch<SalesTeamMember[]>('/crm/team', { token }),
    apiFetch<UserSummary[]>('/users/team/status', { token }),
  ]);

  const nameById = new Map(users.map((u) => [u.id, u.fullName]));
  const setters = team.filter((t) => t.salesRole === 'setter');
  const closers = team.filter((t) => t.salesRole === 'closer');

  return (
    <AppShell user={user}>
      <PageHeader
        title="CRM Dashboard"
        icon={BarChart3}
        tone="orange"
        subtitle="Sales visibility across the pipeline."
        actions={
          <Link href="/crm/leaks" className="text-xs font-medium text-primary hover:text-primary-dark self-center">
            View Sales Leaks →
          </Link>
        }
      />

      <form className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={filters.from ?? ''} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={filters.to ?? ''} />
          </Field>
          <Field label="Setter" htmlFor="setterId">
            <Select id="setterId" name="setterId" defaultValue={filters.setterId ?? ''}>
              <option value="">All setters</option>
              {setters.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {nameById.get(t.userId) ?? t.userId}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Closer" htmlFor="closerId">
            <Select id="closerId" name="closerId" defaultValue={filters.closerId ?? ''}>
              <option value="">All closers</option>
              {closers.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {nameById.get(t.userId) ?? t.userId}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">
            Apply
          </button>
        </div>
      </form>

      <SectionTitle>Money</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="Deposits" value={formatCurrency(dashboard.money.totalDeposits)} />
        <Metric label="Total sales" value={dashboard.money.totalSales} />
        <Metric label="Revenue generated" value={formatCurrency(dashboard.money.revenueGenerated)} />
        <Metric label="Cash collected" value={formatCurrency(dashboard.money.cashCollected)} />
        <Metric label="Refunds" value={formatCurrency(dashboard.money.refunds)} />
        <Metric label="Net revenue" value={formatCurrency(dashboard.money.netRevenue)} />
      </MetricStrip>

      <SectionTitle>Setter metrics</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="Avg speed to lead" value={dashboard.setterMetrics.speedToLeadAvgMinutes != null ? `${dashboard.setterMetrics.speedToLeadAvgMinutes} min` : '—'} />
        <Metric label="Avg booking lag" value={dashboard.setterMetrics.bookingLagAvgDays != null ? `${dashboard.setterMetrics.bookingLagAvgDays}d` : '—'} />
        <Metric label="Calls scheduled" value={dashboard.meetingMetrics.callsScheduled} />
        <Metric label="Calls taken" value={dashboard.meetingMetrics.callsTaken} />
        <Metric label="No-shows" value={dashboard.meetingMetrics.noShows} />
        <Metric label="Rescheduled" value={dashboard.meetingMetrics.rescheduled} />
        <Metric label="Show-up rate" value={`${dashboard.meetingMetrics.showUpRate}%`} />
        <Metric label="DQ rate" value={`${dashboard.meetingMetrics.dqRate}%`} />
      </MetricStrip>

      <SectionTitle>Closer metrics</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="Offers made" value={dashboard.closerMetrics.offersMade} />
        <Metric label="Offer rate" value={`${dashboard.closerMetrics.offerRate}%`} />
        <Metric label="Total sales" value={dashboard.closerMetrics.totalSales} />
        <Metric label="Close rate" value={`${dashboard.closerMetrics.closeRate}%`} />
        <Metric label="Close rate on offers" value={`${dashboard.closerMetrics.closeRateOnOffers}%`} />
        <Metric label="Avg deal size" value={formatCurrency(dashboard.dealMetrics.averageDealSize)} />
        <Metric label="Revenue / call taken" value={formatCurrency(dashboard.dealMetrics.revenuePerCallTaken)} />
      </MetricStrip>

      <SectionTitle>Sale type</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="1-Call sales" value={`${dashboard.saleTypeMetrics.oneCallSales.count} — ${dashboard.saleTypeMetrics.oneCallSales.percentage}%`} />
        <Metric label="Follow-up sales" value={`${dashboard.saleTypeMetrics.followUpSales.count} — ${dashboard.saleTypeMetrics.followUpSales.percentage}%`} />
      </MetricStrip>

      <SectionTitle>Loss analytics</SectionTitle>
      <TableWrap className="mb-8">
        <Table>
          <Thead>
            <Th>Reason</Th>
            <Th align="right">Count</Th>
            <Th align="right">%</Th>
          </Thead>
          <tbody>
            {dashboard.lossAnalytics.map((l) => (
              <Tr key={l.reason}>
                <Td>{LOSS_LABELS[l.reason] ?? l.reason}</Td>
                <Td align="right">{l.count}</Td>
                <Td align="right">{l.percentage}%</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {dashboard.lossAnalytics.length === 0 && <EmptyState>No lost leads in range.</EmptyState>}
      </TableWrap>

      <SectionTitle>Follow-up aging</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="Total follow-up deals" value={dashboard.followUpAging.totalFollowUpDeals} />
        <Metric label="0–3 days" value={dashboard.followUpAging.d0_3} />
        <Metric label="4–6 days" value={dashboard.followUpAging.d4_6} />
        <Metric label="7–13 days" value={dashboard.followUpAging.d7_13} />
        <Metric label="14+ days" value={dashboard.followUpAging.d14_plus} />
      </MetricStrip>

      <SectionTitle>Payment conversion</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="Deposit → Paid in full" value={`${dashboard.paymentConversion.depositToPaidInFullPercent}%`} />
        <Metric label="Avg days to collect" value={dashboard.paymentConversion.averageDaysToCollect ?? '—'} />
      </MetricStrip>

      <SectionTitle>Commissions per rep</SectionTitle>
      <TableWrap>
        <Table>
          <Thead>
            <Th>Closer</Th>
            <Th align="right">Sales</Th>
            <Th align="right">Revenue</Th>
            <Th align="right">Refunds</Th>
            <Th align="right">Net revenue</Th>
            <Th align="right">%</Th>
            <Th align="right">Commission earned</Th>
          </Thead>
          <tbody>
            {commissions.map((c) => (
              <Tr key={c.closerId}>
                <Td className="font-medium text-text">{c.closerName}</Td>
                <Td align="right">{c.totalSales}</Td>
                <Td align="right">{formatCurrency(c.revenue)}</Td>
                <Td align="right">{formatCurrency(c.refunds)}</Td>
                <Td align="right">{formatCurrency(c.netRevenue)}</Td>
                <Td align="right">{c.percent}%</Td>
                <Td align="right" className="font-medium">
                  {formatCurrency(c.commissionEarned)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {commissions.length === 0 && <EmptyState>No closed sales yet.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
