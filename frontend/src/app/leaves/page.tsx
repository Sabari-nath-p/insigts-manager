import { CalendarDays } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { PropertyList, PropertyRow } from '@/components/ui/property-row';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { LeaveStatusPill, LeaveTypePill } from '@/components/ui/pill';
import { RequestLeaveButton } from './request-leave-button';

interface LeaveRequest {
  id: string;
  type: 'paid' | 'medical' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  reviewNote: string | null;
}

interface Overview {
  leavesTaken: { paidDays: number; medicalDays: number; unpaidDays: number; totalDays: number };
  leaveBalance: { paidRemaining: number; medicalRemaining: number };
}

export default async function LeavesPage() {
  const { token, user } = await requireSession();
  const [myLeaves, overview] = await Promise.all([
    apiFetch<LeaveRequest[]>('/leaves/me', { token }),
    apiFetch<Overview>('/users/me/overview', { token }).catch(() => null),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader
        title="Leaves"
        icon={CalendarDays}
        tone="pink"
        subtitle="Manage your leave requests and leave balance."
        actions={<RequestLeaveButton />}
      />

      {overview && (
        <>
          <SectionTitle>Leave balance</SectionTitle>
          <PropertyList className="mb-2">
            <PropertyRow label="Paid remaining" value={overview.leaveBalance.paidRemaining} />
            <PropertyRow label="Medical remaining" value={overview.leaveBalance.medicalRemaining} />
            <PropertyRow label="Days used (this period)" value={overview.leavesTaken.totalDays} />
          </PropertyList>
        </>
      )}

      <SectionTitle>My requests</SectionTitle>
      <TableWrap>
        <Table>
          <Thead>
            <Th>Type</Th>
            <Th>Dates</Th>
            <Th align="right">Days</Th>
            <Th>Status</Th>
            <Th>Reason</Th>
          </Thead>
          <tbody>
            {myLeaves.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <LeaveTypePill type={l.type} />
                </Td>
                <Td>
                  {l.startDate} → {l.endDate}
                </Td>
                <Td align="right">{l.days}</Td>
                <Td>
                  <LeaveStatusPill status={l.status} />
                </Td>
                <Td className="max-w-xs truncate text-muted">{l.reason}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {myLeaves.length === 0 && <EmptyState>No leave requests yet.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
