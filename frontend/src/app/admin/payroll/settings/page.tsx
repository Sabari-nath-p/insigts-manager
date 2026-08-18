import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Table, Thead, Th, TableWrap } from '@/components/ui/table';
import type { LeavePayrollRule, PayrollSettings } from '../types';
import { LeaveRuleRow } from './leave-rule-row';
import { PayslipToggle } from './settings-form';

export default async function PayrollSettingsPage() {
  const { token, user } = await requireSuperAdmin();
  const [rules, settings] = await Promise.all([
    apiFetch<LeavePayrollRule[]>('/payroll/admin/leave-rules', { token }),
    apiFetch<PayrollSettings>('/payroll/admin/settings', { token }),
  ]);

  return (
    <AppShell user={user}>
      <Link href="/admin/payroll" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft size={14} />
        Back to Payroll
      </Link>
      <PageHeader title="Payroll Settings" icon={Settings} tone="gray" subtitle="Leave payroll treatment and payslip access." />

      <SectionTitle>Leave payroll treatment</SectionTitle>
      <p className="mb-3 text-sm text-muted">
        Controls how much of a standard working day is credited toward payroll for each leave type when no attendance was recorded.
      </p>
      <TableWrap className="mb-8">
        <Table>
          <Thead>
            <Th>Leave type</Th>
            <Th>Rule</Th>
          </Thead>
          <tbody>
            {rules.map((r) => (
              <LeaveRuleRow key={r.leaveType} rule={r} />
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <SectionTitle>Payslips</SectionTitle>
      <PayslipToggle settings={settings} />
    </AppShell>
  );
}
