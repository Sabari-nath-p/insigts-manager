'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FieldRow, Input, Select, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/page-header';
import type { Client } from '../../types';
import type { Employee } from '../client-workspace';

export function SettingsTab({ client, employees }: { client: Client; employees: Employee[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = { status: form.get('status'), accountManagerId: form.get('accountManagerId') || null };
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archive "${client.clientName}"? This removes them from active records but keeps everything accessible for historical reporting.`)) return;
    await fetch(`/api/clients/${client.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) });
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to delete client');
      }
      router.push('/clients');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  return (
    <div>
      <SectionTitle>General</SectionTitle>
      <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-4">
        {error && <ErrorText>{error}</ErrorText>}
        <FieldRow>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={client.status}>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Account manager" htmlFor="accountManagerId">
            <Select id="accountManagerId" name="accountManagerId" defaultValue={client.accountManagerId ?? ''}>
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>
        <Button type="submit" disabled={loading} className="w-fit">
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <div className="mb-2 text-xs text-muted">
        Last updated {new Date(client.updatedAt).toLocaleString()}
        {client.updatedBy ? ` by ${client.updatedBy === client.createdBy ? 'the creator' : 'a team member'}` : ''}
      </div>

      <div className="mt-8 rounded-md border border-danger/30 p-4">
        <h3 className="mb-1 text-sm font-semibold text-text">Danger zone</h3>
        <p className="mb-4 text-sm text-muted">
          Prefer archiving over deleting — an archived client stays accessible for historical reporting. Deleting is permanent and removes all
          contacts, team assignments, services, assets, documents, and history for this client.
        </p>
        <div className="mb-4 flex gap-2">
          <Button variant="secondary" onClick={handleArchive}>
            Archive Client
          </Button>
        </div>

        <div className="border-t border-border pt-4">
          <Field label={`Type "${client.clientName}" to confirm permanent deletion`} htmlFor="confirm-name">
            <Input id="confirm-name" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </Field>
          <Button
            variant="danger"
            className="mt-3"
            disabled={confirmText !== client.clientName || deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Deleting…' : 'Delete Client Permanently'}
          </Button>
        </div>
      </div>
    </div>
  );
}
