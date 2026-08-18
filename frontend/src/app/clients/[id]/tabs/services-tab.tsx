'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Select, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Pill } from '@/components/ui/pill';
import { SERVICE_EXAMPLES } from '@/lib/client-constants';
import type { ClientServiceItem, ServiceDeliverable } from '../../types';
import type { Employee } from '../client-workspace';

function progressPct(deliverables: ServiceDeliverable[] | null): number {
  if (!deliverables?.length) return 0;
  const target = deliverables.reduce((s, d) => s + d.target, 0);
  const completed = deliverables.reduce((s, d) => s + d.completed, 0);
  return target > 0 ? Math.round((completed / target) * 100) : 0;
}

export function ServicesTab({
  services,
  clientId,
  canManage,
  employees,
}: {
  services: ClientServiceItem[];
  clientId: string;
  canManage: boolean;
  employees: Employee[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClientServiceItem | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deliverables, setDeliverables] = useState<ServiceDeliverable[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  function openNew() {
    setDeliverables([]);
    setAssignedUserIds([]);
    setEditing('new');
    setError(null);
  }
  function openEdit(service: ClientServiceItem) {
    setDeliverables(service.deliverables ?? []);
    setAssignedUserIds(service.assignedUserIds ?? []);
    setEditing(service);
    setError(null);
  }

  function toggleAssigned(id: string) {
    setAssignedUserIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      startDate: form.get('startDate') || undefined,
      status: form.get('status'),
      notes: form.get('notes') || undefined,
      assignedUserIds,
      deliverables: deliverables.filter((d) => d.name.trim()),
    };
    const isNew = editing === 'new';
    const url = isNew ? `/api/clients/${clientId}/services` : `/api/clients/${clientId}/services/${(editing as ClientServiceItem).id}`;
    try {
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save service');
      router.refresh();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(service: ClientServiceItem) {
    if (!window.confirm(`Remove service "${service.name}"?`)) return;
    await fetch(`/api/clients/${clientId}/services/${service.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">What we provide for this client, and progress against monthly deliverables.</p>
        {canManage && (
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> Add Service
          </Button>
        )}
      </div>

      {services.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No services added yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((s) => {
            const pct = progressPct(s.deliverables);
            return (
              <div key={s.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-text">{s.name}</div>
                    {s.startDate && <div className="text-xs text-muted">Since {s.startDate}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={s.status === 'active' ? 'badgeGreen' : s.status === 'paused' ? 'badgeYellow' : 'badgeGray'}>{s.status}</Pill>
                    {canManage && (
                      <>
                        <button type="button" onClick={() => openEdit(s)} className="text-muted hover:text-primary">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => handleDelete(s)} className="text-muted hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {s.deliverables && s.deliverables.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-3 text-sm text-text">
                    {s.deliverables.map((d) => (
                      <span key={d.name} className="rounded-md bg-black/[0.03] px-2 py-1 dark:bg-white/[0.06]">
                        {d.name}: {d.completed} / {d.target}
                      </span>
                    ))}
                  </div>
                )}
                {s.deliverables && s.deliverables.length > 0 && (
                  <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {s.deliverables && s.deliverables.length > 0 && <div className="text-xs text-muted">{pct}% completed</div>}
                {s.notes && <p className="mt-2 text-sm text-muted">{s.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Panel open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title={editing === 'new' ? 'Add service' : 'Edit service'}>
        {editing && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorText>{error}</ErrorText>}
            <Field label="Service name" htmlFor="name" hint="e.g. Social Media Management">
              <Input id="name" name="name" list="service-examples" defaultValue={editing !== 'new' ? editing.name : ''} required />
              <datalist id="service-examples">
                {SERVICE_EXAMPLES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <FieldRow>
              <Field label="Start date" htmlFor="startDate">
                <Input id="startDate" name="startDate" type="date" defaultValue={editing !== 'new' ? editing.startDate ?? '' : ''} />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={editing !== 'new' ? editing.status : 'active'}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </Select>
              </Field>
            </FieldRow>

            <Field label="Assigned team">
              {employees.length === 0 ? (
                <p className="text-sm text-muted">No employees available.</p>
              ) : (
                <div className="flex max-h-32 flex-wrap gap-3 overflow-y-auto">
                  {employees.map((emp) => (
                    <CheckboxLabel key={emp.id} checked={assignedUserIds.includes(emp.id)} onChange={() => toggleAssigned(emp.id)}>
                      {emp.fullName}
                    </CheckboxLabel>
                  ))}
                </div>
              )}
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Monthly deliverables</span>
                <button
                  type="button"
                  onClick={() => setDeliverables((prev) => [...prev, { name: '', target: 0, completed: 0 }])}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark"
                >
                  <Plus size={13} /> Add deliverable
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {deliverables.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Reels"
                      value={d.name}
                      onChange={(e) => setDeliverables((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Completed"
                      value={d.completed}
                      onChange={(e) => setDeliverables((prev) => prev.map((x, idx) => (idx === i ? { ...x, completed: Number(e.target.value) } : x)))}
                      className="w-24"
                    />
                    <span className="text-muted">/</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Target"
                      value={d.target}
                      onChange={(e) => setDeliverables((prev) => prev.map((x, idx) => (idx === i ? { ...x, target: Number(e.target.value) } : x)))}
                      className="w-24"
                    />
                    <button type="button" onClick={() => setDeliverables((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={editing !== 'new' ? editing.notes ?? '' : ''} className="min-h-16" />
            </Field>

            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Saving…' : editing === 'new' ? 'Add service' : 'Save changes'}
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
