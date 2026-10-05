'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';
import { pm } from '@/lib/pm/client';
import { relativeTime } from '@/lib/pm/format';
import type { PmRole, TeamMember } from '@/lib/pm/types';
import { useToast } from './providers';

interface TeamData {
  canManage: boolean;
  members: TeamMember[];
}

export function TeamView({ initial, meId }: { initial: TeamData; meId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = initial } = useQuery({ queryKey: ['pm-team'], queryFn: () => pm<TeamData>('/team'), initialData: initial });

  async function setAccess(m: TeamMember, role: PmRole, revoked: boolean) {
    const prev = data;
    qc.setQueryData<TeamData>(['pm-team'], (d) => (d ? { ...d, members: d.members.map((x) => (x.id === m.id ? { ...x, pmRole: role, pmRevoked: revoked } : x)) } : d));
    try {
      const res = await pm<{ ok: boolean; message?: string }>(`/team/${m.id}/access`, { method: 'PUT', body: { role, revoked } });
      if (!res.ok) throw new Error(res.message);
    } catch (e) {
      qc.setQueryData(['pm-team'], prev);
      toast((e as Error).message);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-semibold text-text">Team</h1>
        <p className="mt-1 text-sm text-muted">People come from the main user list. Add or deactivate accounts under Employees.</p>
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs font-medium text-muted">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Projects role</th>
                <th className="px-3 py-2 text-right">Open tasks</th>
                <th className="px-3 py-2">Last active</th>
                {data.canManage && <th className="px-3 py-2">Access</th>}
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Avatar name={m.fullName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-text">{m.fullName}</span>
                        <span className="block truncate text-xs text-muted">{m.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text">{m.pmRevoked ? 'No access' : m.pmRole === 'admin' ? 'Admin' : 'Staff'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text">{m.openTasks}</td>
                  <td className="px-3 py-2 text-muted">{m.lastActive ? relativeTime(m.lastActive) : 'Never'}</td>
                  {data.canManage && (
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Projects access for ${m.fullName}`}
                        disabled={m.id === meId}
                        value={m.pmRevoked ? 'none' : m.pmRole}
                        onChange={(e) => (e.target.value === 'none' ? setAccess(m, m.pmRole, true) : setAccess(m, e.target.value as PmRole, false))}
                        className="h-7 rounded-md border border-border bg-surface px-1.5 text-xs text-text outline-none focus:border-primary disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="none">No access</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
