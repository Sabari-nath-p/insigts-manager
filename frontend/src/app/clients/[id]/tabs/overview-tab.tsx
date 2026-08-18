'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, ErrorText } from '@/components/ui/field';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { MarkdownView } from '@/components/ui/markdown-view';
import { PropertyList, PropertyRow, Metric, MetricStrip } from '@/components/ui/property-row';
import { SectionTitle } from '@/components/ui/page-header';
import type { Client, ClientServiceItem, ClientTeamMember, ClientGoal, ClientActivity } from '../../types';

export function OverviewTab({
  client,
  services,
  team,
  goals,
  activity,
  onNavigateTab,
}: {
  client: Client;
  services: ClientServiceItem[];
  team: ClientTeamMember[];
  goals: ClientGoal[];
  activity: ClientActivity[];
  onNavigateTab: (tab: string) => void;
}) {
  const router = useRouter();
  const [editingWork, setEditingWork] = useState(false);
  const [priority, setPriority] = useState(client.currentPriority ?? '');
  const [strategy, setStrategy] = useState(client.currentStrategy ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeServices = services.filter((s) => s.status === 'active');
  const deliverables = useMemo(() => services.flatMap((s) => s.deliverables ?? []), [services]);
  const completedDeliverables = deliverables.reduce((sum, d) => sum + d.completed, 0);
  const pendingDeliverables = deliverables.reduce((sum, d) => sum + Math.max(d.target - d.completed, 0), 0);
  const activeGoals = goals.filter((g) => g.status === 'active');

  const upcomingDates = useMemo(() => {
    const dates: { label: string; date: string }[] = [];
    if (client.renewalDate) dates.push({ label: 'Contract renewal', date: client.renewalDate });
    if (client.contractEndDate) dates.push({ label: 'Contract end', date: client.contractEndDate });
    for (const g of activeGoals) {
      if (g.endDate) dates.push({ label: `Goal: ${g.name}`, date: g.endDate });
    }
    return dates.filter((d) => d.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [client.renewalDate, client.contractEndDate, activeGoals]);

  async function handleSaveWork(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPriority: priority, currentStrategy: strategy }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save');
      router.refresh();
      setEditingWork(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionTitle>Client snapshot</SectionTitle>
      <PropertyList className="mb-6">
        <PropertyRow label="About" value={client.aboutText || client.companyDescription || '—'} />
        <PropertyRow label="Industry" value={client.industry ?? '—'} />
        <PropertyRow label="Niche" value={client.niche ?? '—'} />
        <PropertyRow label="Website" value={client.website ? <a href={client.website} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-dark">{client.website}</a> : '—'} />
        <PropertyRow label="Status" value={client.status} />
        <PropertyRow label="Account manager" value={client.accountManagerName ?? 'Unassigned'} />
      </PropertyList>

      <div className="mb-2 flex items-center justify-between">
        <SectionTitle>Current work</SectionTitle>
        <Button size="sm" variant="secondary" onClick={() => setEditingWork(true)}>
          <Pencil size={13} /> Edit
        </Button>
      </div>
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Current priority</div>
          {client.currentPriority ? <MarkdownView content={client.currentPriority} /> : <p className="text-sm text-muted">Not set yet.</p>}
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Current strategy</div>
          {client.currentStrategy ? <MarkdownView content={client.currentStrategy} /> : <p className="text-sm text-muted">Not set yet.</p>}
        </div>
      </div>

      <MetricStrip className="mb-6">
        <Metric label="Active services" value={activeServices.length} />
        <Metric label="Completed deliverables" value={completedDeliverables} />
        <Metric label="Pending deliverables" value={pendingDeliverables} />
        <Metric label="Active goals" value={activeGoals.length} />
        <Metric label="Team members" value={team.length} />
      </MetricStrip>

      <SectionTitle
        action={
          <button type="button" onClick={() => onNavigateTab('team')} className="text-xs font-medium text-primary hover:text-primary-dark">
            View team →
          </button>
        }
      >
        Current team
      </SectionTitle>
      <div className="mb-6 flex flex-wrap gap-2">
        {team.length === 0 ? (
          <p className="text-sm text-muted">No one assigned yet.</p>
        ) : (
          team.map((t) => (
            <span key={t.id} className="rounded-full bg-black/[0.04] px-3 py-1 text-xs text-text dark:bg-white/[0.06]">
              {t.fullName} <span className="text-muted">· {t.role}</span>
            </span>
          ))
        )}
      </div>

      {upcomingDates.length > 0 && (
        <>
          <SectionTitle>Upcoming dates</SectionTitle>
          <div className="mb-6 flex flex-col gap-1.5">
            {upcomingDates.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text">{d.label}</span>
                <span className="text-muted">{d.date}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle
        action={
          <button type="button" onClick={() => onNavigateTab('activity')} className="text-xs font-medium text-primary hover:text-primary-dark">
            View all →
          </button>
        }
      >
        Recent activity
      </SectionTitle>
      <div className="flex flex-col gap-2">
        {activity.length === 0 ? (
          <p className="text-sm text-muted">No activity yet.</p>
        ) : (
          activity.slice(0, 6).map((a) => (
            <div key={a.id} className="text-sm text-text">
              <span className="font-medium">{a.actorName}</span> {a.description.charAt(0).toLowerCase() + a.description.slice(1)}
              <span className="ml-2 text-xs text-muted">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>

      <Panel open={editingWork} onOpenChange={setEditingWork} title="Edit current work">
        <form onSubmit={handleSaveWork} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="Current priority" htmlFor="priority">
            <MarkdownEditor id="priority" value={priority} onChange={setPriority} placeholder="e.g. Increase qualified leads via Meta lead-gen campaigns." />
          </Field>
          <Field label="Current strategy" htmlFor="strategy">
            <MarkdownEditor id="strategy" value={strategy} onChange={setStrategy} placeholder="e.g. Focus on testimonial content and lead-generation." />
          </Field>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
