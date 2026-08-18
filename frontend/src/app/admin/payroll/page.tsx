import Link from 'next/link';
import { IndianRupee } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { LinkButton } from '@/components/ui/button';
import { Select, Input, CheckboxLabel } from '@/components/ui/field';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import type { BadgeKey } from '@/lib/attendance-format';
import type { AdminPayrollRecord, PayrollDashboard } from './types';
import { CalculateButton } from './calculate-button';

const STATUS_TONE: Record<string, BadgeKey> = {
  calculated: 'badgeGray',
  under_review: 'badgeYellow',
  approved: 'badgeBlue',
  finalized: 'badgeGreen',
};

const PAYMENT_TONE: Record<string, BadgeKey> = {
  paid: 'badgeGreen',
  pending: 'badgeYellow',
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

interface Filters {
  month?: string;
  status?: string;
  search?: string;
  hasExceptions?: string;
}

export default async function AdminPayrollPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { token, user } = await requireSuperAdmin();
  const filters = await searchParams;
  const month = filters.month || currentMonth();

  const query = new URLSearchParams();
  query.set('month', month);
  if (filters.status) query.set('status', filters.status);
  if (filters.search) query.set('search', filters.search);
  if (filters.hasExceptions) query.set('hasExceptions', filters.hasExceptions);

  const [dashboard, records] = await Promise.all([
    apiFetch<PayrollDashboard>(`/payroll/admin/dashboard?month=${month}`, { token }),
    apiFetch<AdminPayrollRecord[]>(`/payroll/admin/records?${query.toString()}`, { token }),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader
        title="Payroll"
        icon={IndianRupee}
        tone="green"
        subtitle="Company-wide payroll calculation and management."
        actions={
          <>
            <LinkButton href="/admin/payroll/compensation" variant="secondary" size="sm">
              Employee salaries
            </LinkButton>
            <LinkButton href="/admin/payroll/settings" variant="secondary" size="sm">
              Settings
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <form className="flex items-end gap-2">
          <Input name="month" type="month" defaultValue={month} className="w-auto py-1.5" title="Payroll month" />
          <button
            type="submit"
            className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-text hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
          >
            View month
          </button>
        </form>
        <CalculateButton month={month} />
      </div>

      <MetricStrip className="mb-8">
        <Metric label="Total employees" value={dashboard.totalEmployees} />
        <Metric label="Total payroll" value={`₹${dashboard.totalPayroll.toLocaleString('en-IN')}`} />
        <Metric label="Scheduled hrs" value={dashboard.totalScheduledHours} />
        <Metric label="Payable hrs" value={dashboard.totalPayableHours} />
        <Metric label="Actual hrs" value={dashboard.totalActualHours} />
        <Metric label="Extra hrs" value={dashboard.totalExtraHours} />
        <Metric label="Short hours" value={dashboard.employeesWithShortHours} />
        <Metric label="Full hours" value={dashboard.employeesWithFullHours} />
        <Metric label="Attendance issues" value={dashboard.employeesWithAttendanceIssues} />
        <Metric label="Pending" value={dashboard.payrollPending} />
        <Metric label="Under review" value={dashboard.payrollUnderReview} />
        <Metric label="Approved" value={dashboard.payrollApproved} />
        <Metric label="Finalized" value={dashboard.payrollFinalized} />
        <Metric label="Paid" value={dashboard.payrollPaid} />
      </MetricStrip>

      <SectionTitle
        action={
          <a
            href={`/api/payroll/admin/records/export?month=${month}`}
            className="text-xs font-medium text-primary hover:text-primary-dark"
          >
            Export CSV →
          </a>
        }
      >
        Filters
      </SectionTitle>
      <form className="mb-6 flex flex-wrap items-end gap-2.5">
        <Input name="month" type="hidden" value={month} />
        <Input name="search" placeholder="Search employee" defaultValue={filters.search ?? ''} className="w-auto py-1.5" />
        <Select name="status" defaultValue={filters.status ?? ''} className="w-auto py-1.5">
          <option value="">All statuses</option>
          <option value="calculated">Calculated</option>
          <option value="under_review">Under review</option>
          <option value="approved">Approved</option>
          <option value="finalized">Finalized</option>
        </Select>
        <div className="flex items-center gap-3 rounded-md border border-border px-3 py-1.5">
          <CheckboxLabel name="hasExceptions" value="true" defaultChecked={filters.hasExceptions === 'true'}>
            Has exceptions
          </CheckboxLabel>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
        >
          Apply
        </button>
      </form>

      <SectionTitle>{records.length} record(s)</SectionTitle>
      <TableWrap>
        <Table>
          <Thead sticky>
            <Th>Employee</Th>
            <Th align="right">Working days</Th>
            <Th align="right">Payable hrs</Th>
            <Th align="right">Extra hrs</Th>
            <Th align="right">Base salary</Th>
            <Th align="right">Final amount</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <Th align="right">Exceptions</Th>
          </Thead>
          <tbody>
            {records.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <Link href={`/admin/payroll/${r.id}`} className="font-medium text-text hover:text-primary">
                    {r.fullName}
                  </Link>
                  {r.department && <span className="ml-2 text-xs text-muted">{r.department}</span>}
                </Td>
                <Td align="right">{r.workingDays}</Td>
                <Td align="right">{(r.payableMinutes / 60).toFixed(1)}</Td>
                <Td align="right" className="text-muted">
                  {(r.extraMinutes / 60).toFixed(1)}
                </Td>
                <Td align="right">₹{Number(r.baseSalaryEarned).toLocaleString('en-IN')}</Td>
                <Td align="right" className="font-medium">
                  ₹{Number(r.finalPayableAmount).toLocaleString('en-IN')}
                </Td>
                <Td>
                  <Pill tone={STATUS_TONE[r.status] ?? 'badgeGray'}>{r.status.replace('_', ' ')}</Pill>
                </Td>
                <Td>
                  <Pill tone={PAYMENT_TONE[r.paymentStatus] ?? 'badgeGray'}>{r.paymentStatus}</Pill>
                </Td>
                <Td align="right">
                  {r.exceptionsCount > 0 ? (
                    <span className="text-xs font-medium text-danger">{r.exceptionsCount}</span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {records.length === 0 && <EmptyState>No payroll records for this month yet — calculate payroll to get started.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
