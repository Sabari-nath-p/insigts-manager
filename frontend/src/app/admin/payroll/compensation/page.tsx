import { IndianRupee } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import type { BadgeKey } from '@/lib/attendance-format';
import type { EmployeeCompensation } from '../types';
import { CompensationPanel } from './compensation-panel';

interface UserSummary {
  id: string;
  fullName: string;
  role: string;
  department: string | null;
  isActive: boolean;
}

const STATUS_TONE: Record<string, BadgeKey> = {
  active: 'badgeGreen',
  on_hold: 'badgeYellow',
  excluded: 'badgeGray',
};

export default async function CompensationPage() {
  const { token, user } = await requireSuperAdmin();
  const users = await apiFetch<UserSummary[]>('/users', { token });
  const activeUsers = users.filter((u) => u.isActive);

  const histories = await Promise.all(
    activeUsers.map((u) => apiFetch<EmployeeCompensation[]>(`/payroll/admin/compensation/${u.id}`, { token }).catch(() => [])),
  );

  return (
    <AppShell user={user}>
      <Link href="/admin/payroll" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft size={14} />
        Back to Payroll
      </Link>
      <PageHeader title="Employee Salaries" icon={IndianRupee} tone="green" subtitle="Effective-dated compensation used for payroll calculation." />

      <TableWrap>
        <Table>
          <Thead>
            <Th>Employee</Th>
            <Th align="right">Monthly salary</Th>
            <Th align="right">Standard hrs/day</Th>
            <Th>Payroll status</Th>
            <Th>Effective from</Th>
            <Th />
          </Thead>
          <tbody>
            {activeUsers.map((u, i) => {
              const history = histories[i];
              const current = history[0];
              return (
                <Tr key={u.id}>
                  <Td>
                    <span className="font-medium text-text">{u.fullName}</span>
                    {u.department && <span className="ml-2 text-xs text-muted">{u.department}</span>}
                  </Td>
                  <Td align="right">{current ? `₹${Number(current.monthlySalary).toLocaleString('en-IN')}` : '—'}</Td>
                  <Td align="right">{current ? current.standardWorkingHoursPerDay : '—'}</Td>
                  <Td>
                    {current ? <Pill tone={STATUS_TONE[current.payrollStatus] ?? 'badgeGray'}>{current.payrollStatus}</Pill> : '—'}
                  </Td>
                  <Td className="text-muted">{current?.effectiveFrom ?? '—'}</Td>
                  <Td align="right">
                    <CompensationPanel userId={u.id} fullName={u.fullName} history={history} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        {activeUsers.length === 0 && <EmptyState>No active employees.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
