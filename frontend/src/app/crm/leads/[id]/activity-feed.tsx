'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, Textarea, ErrorText } from '@/components/ui/field';
import { PropertyList, PropertyRow } from '@/components/ui/property-row';
import { ACTIVITY_TYPES, type LeadActivity } from '../../types';
import { ACTIVITY_TYPE_LABELS, formatDateTime } from '@/lib/crm-format';

export function ActivityFeed({ leadId, activities }: { leadId: string; activities: LeadActivity[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: fd.get('type'), description: fd.get('description') }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to add activity');
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 rounded-md border border-border p-3">
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex gap-2">
          <Select name="type" defaultValue="call" className="w-auto">
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Adding…' : 'Add activity'}
          </Button>
        </div>
        <Textarea name="description" placeholder="What happened?" rows={2} required />
      </form>

      <PropertyList>
        {activities.map((a) => (
          <PropertyRow
            key={a.id}
            label={formatDateTime(a.createdAt)}
            value={
              <>
                <span className="font-medium text-text">{ACTIVITY_TYPE_LABELS[a.type] ?? a.type}</span>
                {' — '}
                {a.description}
              </>
            }
          />
        ))}
        {activities.length === 0 && <p className="py-2 text-sm text-muted">No activity yet.</p>}
      </PropertyList>
    </div>
  );
}
