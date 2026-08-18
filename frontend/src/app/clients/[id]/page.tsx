import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { ClientWorkspace } from './client-workspace';
import type {
  Client,
  ClientContact,
  ClientTeamMember,
  ClientServiceItem,
  ClientGoal,
  ClientAsset,
  ClientDocument,
  ClientLink,
  ClientNote,
  ClientMeeting,
  ClientActivity,
} from '../types';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, user } = await requireSession();

  let data: [
    Client,
    ClientContact[],
    ClientTeamMember[],
    ClientServiceItem[],
    ClientGoal[],
    ClientAsset[],
    ClientDocument[],
    ClientLink[],
    ClientNote[],
    ClientMeeting[],
    ClientActivity[],
    { id: string; fullName: string; role: string }[],
  ];
  try {
    data = await Promise.all([
      apiFetch<Client>(`/clients/${id}`, { token }),
      apiFetch<ClientContact[]>(`/clients/${id}/contacts`, { token }),
      apiFetch<ClientTeamMember[]>(`/clients/${id}/team`, { token }),
      apiFetch<ClientServiceItem[]>(`/clients/${id}/services`, { token }),
      apiFetch<ClientGoal[]>(`/clients/${id}/goals`, { token }),
      apiFetch<ClientAsset[]>(`/clients/${id}/assets`, { token }),
      apiFetch<ClientDocument[]>(`/clients/${id}/documents`, { token }),
      apiFetch<ClientLink[]>(`/clients/${id}/links`, { token }),
      apiFetch<ClientNote[]>(`/clients/${id}/notes`, { token }),
      apiFetch<ClientMeeting[]>(`/clients/${id}/meetings`, { token }),
      apiFetch<ClientActivity[]>(`/clients/${id}/activity`, { token }),
      apiFetch<{ id: string; fullName: string; role: string }[]>('/users/team/status', { token }),
    ]);
  } catch {
    notFound();
  }

  const [client, contacts, team, services, goals, assets, documents, links, notes, meetings, activity, employees] = data;
  const isSuperAdmin = user.role === 'super_admin';
  const isAccountManager = client.accountManagerId === user.userId;
  const canManage = isSuperAdmin || isAccountManager;

  return (
    <AppShell user={user} title={client.clientName}>
      <ClientWorkspace
        client={client}
        contacts={contacts}
        team={team}
        services={services}
        goals={goals}
        assets={assets}
        documents={documents}
        links={links}
        notes={notes}
        meetings={meetings}
        activity={activity}
        employees={employees}
        currentUserId={user.userId}
        canManage={canManage}
      />
    </AppShell>
  );
}
