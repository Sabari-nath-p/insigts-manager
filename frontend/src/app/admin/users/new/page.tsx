import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { UserCog } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { CreateUserForm } from './create-user-form';

export default async function NewUserPage() {
  const { token, user } = await requireSuperAdmin();
  const managers = await apiFetch<{ id: string; fullName: string; role: string }[]>('/users/managers', { token });

  return (
    <AppShell user={user} title="New account">
      <PageHeader title="New account" icon={UserCog} tone="orange" subtitle="Create another super admin, manager, or employee account." />
      <CreateUserForm managers={managers} />
    </AppShell>
  );
}
