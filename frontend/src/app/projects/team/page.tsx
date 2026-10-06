import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import type { TeamMember } from '@/lib/pm/types';
import { TeamView } from '../_components/team-view';

export default async function TeamPage() {
  const { token, user } = await requireSession();
  const team = await apiFetch<{ canManage: boolean; members: TeamMember[] }>('/pm/team', { token });
  return <TeamView initial={team} meId={user.userId} />;
}
