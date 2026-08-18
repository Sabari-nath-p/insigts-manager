import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { UserCog } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmployeeTable, type UserSummary } from './employee-table';
import { NewEmployeeButton } from './new-employee-button';

export default async function AdminUsersPage() {
  const { token, user } = await requireSuperAdmin();
  const [employees, managers] = await Promise.all([
    apiFetch<UserSummary[]>('/users', { token }),
    apiFetch<{ id: string; fullName: string; role: string }[]>('/users/managers', { token }),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader title="Employees" icon={UserCog} tone="orange" subtitle={`${employees.length} account(s)`} actions={<NewEmployeeButton managers={managers} />} />
      <EmployeeTable employees={employees} managers={managers} />
    </AppShell>
  );
}
