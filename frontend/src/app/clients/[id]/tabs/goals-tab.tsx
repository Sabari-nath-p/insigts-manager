'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Select, Textarea, ErrorText } from '@/components/ui/field';
import { Pill } from '@/components/ui/pill';
import type { ClientGoal } from '../../types';
import type { Employee } from '../client-workspace';

export function GoalsTab({ goals, clientId, currentUserId, canManage, employees }: { goals: ClientGoal[]; clientId: string; currentUserId: string; canManage: boolean; employees: Employee[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClientGoal | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      target: Number(form.get('target')),
      current: Number(form.get('current') || 0),
      startDate: form.get('startDate') || undefined,
      endDate: form.get('endDate') || undefined,
      ownerId: form.get('ownerId') || undefined,
      status: form.get('status'),
      notes: form.get('notes') || undefined,
    };
    const isNew = editing === 'new';
    const url = isNew ? `/api/clients/${clientId}/goals` : `/api/clients/${clientId}/goals/${(editing as ClientGoal).id}`;
    try {
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save goal');
      router.refresh();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(goal: ClientGoal) {
    if (!window.confirm(`Remove goal "${goal.name}"?`)) return;
    await fetch(`/api/clients/${clientId}/goals/${goal.id}`, { method: 'DELETE' });
    router.refresh();
  }

  function ownerName(id: string | null) {
    if (!id) return null;
    return employees.find((e) => e.id === id)?.fullName ?? null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Lead generation, sales, reach, engagement, revenue — whatever this client is being measured on.</p>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus size={14} /> Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No goals tracked yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
            const canEdit = canManage || g.ownerId === currentUserId;
            return (
              <div key={g.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="font-semibold text-text">{g.name}</div>
                  <div className="flex items-center gap-2">
                    <Pill tone={g.status === 'achieved' ? 'badgeGreen' : g.status === 'missed' ? 'badgeRed' : 'badgeBlue'}>{g.status}</Pill>
                    {canEdit && (
                      <>
                        <button type="button" onClick={() => setEditing(g)} className="text-muted hover:text-primary">
                          <Pencil size={13} />
                        </button>
                        <button type="button" onClick={() => handleDelete(g)} className="text-muted hover:text-danger">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mb-1 text-sm text-text">
                  {g.current} / {g.target}
                </div>
                <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-xs text-muted">
                  {pct}% · {ownerName(g.ownerId) ?? 'No owner'}
                  {g.endDate ? ` · Ends ${g.endDate}` : ''}
                </div>
                {g.notes && <p className="mt-2 text-sm text-muted">{g.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Panel open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title={editing === 'new' ? 'Add goal' : 'Edit goal'}>
        {editing && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorText>{error}</ErrorText>}
            <Field label="Goal name" htmlFor="name" hint="e.g. Monthly Lead Target">
              <Input id="name" name="name" defaultValue={editing !== 'new' ? editing.name : ''} required />
            </Field>
            <FieldRow>
              <Field label="Target" htmlFor="target">
                <Input id="target" name="target" type="number" defaultValue={editing !== 'new' ? editing.target : ''} required />
              </Field>
              <Field label="Current value" htmlFor="current">
                <Input id="current" name="current" type="number" defaultValue={editing !== 'new' ? editing.current : 0} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Start date" htmlFor="startDate">
                <Input id="startDate" name="startDate" type="date" defaultValue={editing !== 'new' ? editing.startDate ?? '' : ''} />
              </Field>
              <Field label="End date" htmlFor="endDate">
                <Input id="endDate" name="endDate" type="date" defaultValue={editing !== 'new' ? editing.endDate ?? '' : ''} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Owner" htmlFor="ownerId">
                <Select id="ownerId" name="ownerId" defaultValue={editing !== 'new' ? editing.ownerId ?? '' : ''}>
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={editing !== 'new' ? editing.status : 'active'}>
                  <option value="active">Active</option>
                  <option value="achieved">Achieved</option>
                  <option value="missed">Missed</option>
                </Select>
              </Field>
            </FieldRow>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={editing !== 'new' ? editing.notes ?? '' : ''} className="min-h-12" />
            </Field>
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Saving…' : editing === 'new' ? 'Add goal' : 'Save changes'}
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
