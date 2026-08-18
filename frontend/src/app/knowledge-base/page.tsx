import { BookOpen } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { KnowledgeBaseClient } from './knowledge-base-client';
import type { KnowledgeResource } from './types';

interface UserSummary {
  department: string | null;
}

export default async function KnowledgeBasePage() {
  const { token, user } = await requireSession();
  const isAdmin = user.role === 'super_admin';

  const [resources, employees] = await Promise.all([
    apiFetch<KnowledgeResource[]>('/knowledge-base/resources', { token }),
    isAdmin ? apiFetch<UserSummary[]>('/users', { token }) : Promise.resolve([] as UserSummary[]),
  ]);
  const departments = Array.from(new Set(employees.map((e) => e.department).filter((d): d is string => !!d)));

  return (
    <AppShell user={user}>
      <PageHeader
        title="Internal Knowledge Base"
        icon={BookOpen}
        tone="teal"
        subtitle="Company SOPs, policies, templates, and resources in one place."
      />
      <KnowledgeBaseClient resources={resources} departments={departments} isAdmin={isAdmin} />
    </AppShell>
  );
}
