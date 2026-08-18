import { Settings } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import type { CommissionRule, LeadSource, SalesTeamMember } from '../types';
import { SourcesManager } from './sources-manager';
import { CommissionRulesManager } from './commission-rules-manager';
import { TeamManager } from './team-manager';
import { GoalForm } from './goal-form';

interface UserSummary {
  id: string;
  fullName: string;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function CrmSettingsPage() {
  const { token, user } = await requireSuperAdmin();
  const [sources, rules, team, users, goal] = await Promise.all([
    apiFetch<LeadSource[]>('/crm/sources', { token }),
    apiFetch<CommissionRule[]>('/crm/commission-rules', { token }),
    apiFetch<SalesTeamMember[]>('/crm/team', { token }),
    apiFetch<UserSummary[]>('/users', { token }),
    apiFetch<{ revenueGoalAmount: string } | null>(`/crm/goals/${currentMonth()}`, { token }).catch(() => null),
  ]);

  const closers = team.filter((t) => t.salesRole === 'closer').map((t) => users.find((u) => u.id === t.userId)).filter((u): u is UserSummary => !!u);

  return (
    <AppShell user={user}>
      <PageHeader title="CRM Settings" icon={Settings} tone="gray" subtitle="Lead sources, commission rules, sales team and revenue goals." />

      <SectionTitle>Lead sources</SectionTitle>
      <div className="mb-8">
        <SourcesManager sources={sources} />
      </div>

      <SectionTitle>Sales team</SectionTitle>
      <div className="mb-8">
        <TeamManager team={team} users={users} />
      </div>

      <SectionTitle>Commission rules</SectionTitle>
      <div className="mb-8">
        <CommissionRulesManager rules={rules} closers={closers} />
      </div>

      <SectionTitle>Revenue goal</SectionTitle>
      <GoalForm currentGoal={goal ? Number(goal.revenueGoalAmount) : null} />
    </AppShell>
  );
}
