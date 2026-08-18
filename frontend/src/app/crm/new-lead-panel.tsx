'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, Select, ErrorText } from '@/components/ui/field';
import type { LeadSource, SalesTeamMember } from './types';

interface UserOption {
  id: string;
  fullName: string;
}

export function NewLeadPanel({
  sources,
  team,
  users,
}: {
  sources: LeadSource[];
  team: SalesTeamMember[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; leadName: string; companyName: string | null; status: string }> | null>(null);

  const userById = new Map(users.map((u) => [u.id, u]));
  const setters = team.filter((t) => t.salesRole === 'setter').map((t) => userById.get(t.userId)).filter((u): u is UserOption => !!u);
  const closers = team.filter((t) => t.salesRole === 'closer').map((t) => userById.get(t.userId)).filter((u): u is UserOption => !!u);

  async function submit(form: HTMLFormElement, skipDuplicateCheck: boolean) {
    setLoading(true);
    setError(null);
    const fd = new FormData(form);
    const payload = {
      leadName: fd.get('leadName'),
      companyName: fd.get('companyName') || undefined,
      email: fd.get('email') || undefined,
      phone: fd.get('phone') || undefined,
      whatsapp: fd.get('whatsapp') || undefined,
      leadSourceId: fd.get('leadSourceId') || undefined,
      setterId: fd.get('setterId') || undefined,
      closerId: fd.get('closerId') || undefined,
      skipDuplicateCheck,
    };
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to create lead');
      if (data.possibleDuplicates) {
        setDuplicates(data.possibleDuplicates);
        return;
      }
      setOpen(false);
      setDuplicates(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(e.currentTarget, false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add Lead
      </Button>
      <Panel open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDuplicates(null); }} title="Add Lead" description="Contact info and initial assignment">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}

          {duplicates && duplicates.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-badge-yellow-bg p-3">
              <p className="mb-2 text-sm font-medium text-text">Possible existing lead found:</p>
              <ul className="mb-3 list-inside list-disc text-sm text-muted">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    {d.leadName} {d.companyName ? `— ${d.companyName}` : ''} ({d.status})
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => submit((e.currentTarget.closest('form') as HTMLFormElement), true)}
                >
                  Continue as new lead
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDuplicates(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Field label="Lead name" htmlFor="leadName">
            <Input id="leadName" name="leadName" required />
          </Field>
          <Field label="Company" htmlFor="companyName">
            <Input id="companyName" name="companyName" />
          </Field>
          <FieldRow>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" />
            </Field>
            <Field label="Source" htmlFor="leadSourceId">
              <Select id="leadSourceId" name="leadSourceId" defaultValue="">
                <option value="">—</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Setter" htmlFor="setterId">
              <Select id="setterId" name="setterId" defaultValue="">
                <option value="">—</option>
                {setters.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Closer" htmlFor="closerId">
              <Select id="closerId" name="closerId" defaultValue="">
                <option value="">—</option>
                {closers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldRow>

          <Button type="submit" disabled={loading} className="self-start">
            {loading ? 'Creating…' : 'Create lead'}
          </Button>
        </form>
      </Panel>
    </>
  );
}
