'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Textarea, ErrorText } from '@/components/ui/field';
import { PropertyList, PropertyRow, Metric, MetricStrip } from '@/components/ui/property-row';
import { SectionTitle } from '@/components/ui/page-header';
import type { Client, ClientServiceItem } from '../../types';

export function RetainerTab({ client, services, canManage }: { client: Client; services: ClientServiceItem[]; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const deliverables = useMemo(
    () => services.flatMap((s) => (s.deliverables ?? []).map((d) => ({ ...d, service: s.name }))),
    [services],
  );
  const totalTarget = deliverables.reduce((sum, d) => sum + d.target, 0);
  const totalCompleted = deliverables.reduce((sum, d) => sum + d.completed, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      retainerPackage: form.get('retainerPackage') || undefined,
      retainerValue: form.get('retainerValue') ? Number(form.get('retainerValue')) : undefined,
      renewalDate: form.get('renewalDate') || undefined,
      contractStartDate: form.get('contractStartDate') || undefined,
      contractEndDate: form.get('contractEndDate') || undefined,
      retainerNotes: form.get('retainerNotes') || undefined,
    };
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save');
      router.refresh();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Deliverable progress is pulled live from the Services tab — nothing here is tracked twice.</p>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Edit Retainer
          </Button>
        )}
      </div>

      <PropertyList className="mb-6">
        <PropertyRow label="Package" value={client.retainerPackage ?? '—'} />
        <PropertyRow label="Retainer value" value={canManage ? (client.retainerValue ? `₹${Number(client.retainerValue).toLocaleString()}` : '—') : 'Restricted'} />
        <PropertyRow label="Contract period" value={client.contractStartDate && client.contractEndDate ? `${client.contractStartDate} → ${client.contractEndDate}` : '—'} />
        <PropertyRow label="Renewal date" value={client.renewalDate ?? '—'} />
        {canManage && <PropertyRow label="Notes" value={client.retainerNotes ?? '—'} />}
      </PropertyList>

      {deliverables.length > 0 && (
        <>
          <SectionTitle>Monthly deliverables</SectionTitle>
          <MetricStrip className="mb-4">
            <Metric label="Overall progress" value={`${overallPct}%`} />
            <Metric label="Completed" value={totalCompleted} />
            <Metric label="Remaining" value={Math.max(totalTarget - totalCompleted, 0)} />
          </MetricStrip>
          <div className="flex flex-col gap-2">
            {deliverables.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-text">
                  {d.name} <span className="text-muted">({d.service})</span>
                </span>
                <span className="text-muted">
                  {d.completed} / {d.target}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Panel open={editing} onOpenChange={setEditing} title="Edit retainer">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="Package" htmlFor="retainerPackage">
            <Input id="retainerPackage" name="retainerPackage" defaultValue={client.retainerPackage ?? ''} />
          </Field>
          <Field label="Retainer value" htmlFor="retainerValue" hint="Only visible to the account manager and super admins">
            <Input id="retainerValue" name="retainerValue" type="number" min={0} step="0.01" defaultValue={client.retainerValue ?? ''} />
          </Field>
          <FieldRow>
            <Field label="Contract start" htmlFor="contractStartDate">
              <Input id="contractStartDate" name="contractStartDate" type="date" defaultValue={client.contractStartDate ?? ''} />
            </Field>
            <Field label="Contract end" htmlFor="contractEndDate">
              <Input id="contractEndDate" name="contractEndDate" type="date" defaultValue={client.contractEndDate ?? ''} />
            </Field>
          </FieldRow>
          <Field label="Renewal date" htmlFor="renewalDate">
            <Input id="renewalDate" name="renewalDate" type="date" defaultValue={client.renewalDate ?? ''} />
          </Field>
          <Field label="Notes" htmlFor="retainerNotes">
            <Textarea id="retainerNotes" name="retainerNotes" defaultValue={client.retainerNotes ?? ''} className="min-h-16" />
          </Field>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
