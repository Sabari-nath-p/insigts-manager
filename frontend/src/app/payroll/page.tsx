import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import type { BadgeKey } from '@/lib/attendance-format';
import type { EmployeePayrollRecord } from './types';

const STATUS_TONE: Record<string, BadgeKey> = {
  finalized: 'badgeGreen',
};

const PAYMENT_TONE: Record<string, BadgeKey> = {
  paid: 'badgeGreen',
  pending: 'badgeYellow',
};

export default async function PayrollPage() {
  const { token, user } = await requireSession();
  const records = await apiFetch<EmployeePayrollRecord[]>('/payroll/me', { token }).catch(() => []);
  const current = records[0];
  const history = records.slice(1);

  return (
    <AppShell user={user}>
      <PageHeader title="My Payroll" icon={Wallet} tone="green" subtitle="Your working hours and finalized payroll, month by month." />

      {!current && (
        <EmptyState>No finalized payroll yet. Once HR finalizes a month, it will appear here.</EmptyState>
      )}

      {current && (
        <>
          <SectionTitle
            action={
              <Link href={`/payroll/${current.id}/payslip`} className="text-xs font-medium text-primary hover:text-primary-dark">
                View payslip →
              </Link>
            }
          >
            {formatMonth(current.payrollMonth)}
          </SectionTitle>
          <MetricStrip className="mb-3">
            <Metric label="Working days" value={current.workingDays} />
            <Metric label="Scheduled hours" value={current.scheduledHours} />
            <Metric label="Actual hours" value={current.actualHours} />
            <Metric label="Payable hours" value={current.payableHours} />
            <Metric label="Extra hours" value={current.extraHours} />
            <Metric label="Payroll amount" value={`₹${current.payrollAmount.toLocaleString('en-IN')}`} />
          </MetricStrip>
          <div className="mb-8 flex items-center gap-2">
            <Pill tone={STATUS_TONE[current.status] ?? 'badgeGray'}>{current.status.replace('_', ' ')}</Pill>
            <Pill tone={PAYMENT_TONE[current.paymentStatus] ?? 'badgeGray'}>{current.paymentStatus}</Pill>
          </div>
          {current.visibleAdjustments.length > 0 && (
            <>
              <SectionTitle>Adjustments</SectionTitle>
              <TableWrap className="mb-8">
                <Table>
                  <Thead>
                    <Th>Type</Th>
                    <Th>Reason</Th>
                    <Th align="right">Amount</Th>
                  </Thead>
                  <tbody>
                    {current.visibleAdjustments.map((a, i) => (
                      <Tr key={i}>
                        <Td className="capitalize">{a.type.replace('_', ' ')}</Td>
                        <Td className="text-muted">{a.reason}</Td>
                        <Td align="right">₹{Number(a.amount).toLocaleString('en-IN')}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </>
          )}
        </>
      )}

      <SectionTitle>Payroll history</SectionTitle>
      <TableWrap>
        <Table>
          <Thead>
            <Th>Month</Th>
            <Th align="right">Working days</Th>
            <Th align="right">Scheduled hrs</Th>
            <Th align="right">Payable hrs</Th>
            <Th align="right">Extra hrs</Th>
            <Th align="right">Payroll amount</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <Th />
          </Thead>
          <tbody>
            {(current ? history : records).map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-text">{formatMonth(r.payrollMonth)}</Td>
                <Td align="right">{r.workingDays}</Td>
                <Td align="right">{r.scheduledHours}</Td>
                <Td align="right">{r.payableHours}</Td>
                <Td align="right" className="text-muted">
                  {r.extraHours}
                </Td>
                <Td align="right">₹{r.payrollAmount.toLocaleString('en-IN')}</Td>
                <Td>
                  <Pill tone={STATUS_TONE[r.status] ?? 'badgeGray'}>{r.status.replace('_', ' ')}</Pill>
                </Td>
                <Td>
                  <Pill tone={PAYMENT_TONE[r.paymentStatus] ?? 'badgeGray'}>{r.paymentStatus}</Pill>
                </Td>
                <Td align="right">
                  <Link href={`/payroll/${r.id}/payslip`} className="text-xs font-medium text-primary hover:text-primary-dark">
                    Payslip
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {(current ? history : records).length === 0 && <EmptyState>No earlier payroll records yet.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
