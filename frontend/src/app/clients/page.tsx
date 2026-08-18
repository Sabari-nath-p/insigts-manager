import { Building2 } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ClientList } from './client-list';
import type { Client } from './types';

export default async function ClientsPage() {
  const { token, user } = await requireSession();
  const isSuperAdmin = user.role === 'super_admin';

  const [clients, employees] = await Promise.all([
    apiFetch<Client[]>('/clients', { token }),
    apiFetch<{ id: string; fullName: string; role: string }[]>('/users/team/status', { token }),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader
        title="Clients"
        icon={Building2}
        tone="purple"
        subtitle="The single source of truth for every client — who they are, what we do for them, and what needs attention."
      />
      <ClientList clients={clients} employees={employees} isSuperAdmin={isSuperAdmin} />
    </AppShell>
  );
}
