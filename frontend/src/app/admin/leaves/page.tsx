import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { LeaveRequestsClient, type LeaveRequest } from './leave-requests-client';

interface UserSummary {
  id: string;
  fullName: string;
  email: string;
}

export default async function AdminLeavesPage() {
  const { token, user } = await requireSuperAdmin();
  const [leaves, employees] = await Promise.all([
    apiFetch<LeaveRequest[]>('/leaves', { token }),
    apiFetch<UserSummary[]>('/users', { token }),
  ]);

  const nameById = Object.fromEntries(employees.map((e) => [e.id, e.fullName]));
  const pendingCount = leaves.filter((l) => l.status === 'pending').length;

  return (
    <AppShell user={user}>
      <PageHeader title="Leave requests" icon={CalendarDays} tone="pink" subtitle={`${pendingCount} awaiting review`} />
      <LeaveRequestsClient leaves={leaves} nameById={nameById} />
    </AppShell>
  );
}
