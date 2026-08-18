'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, Star, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import type { ClientContact } from '../../types';

export function ContactsTab({ contacts, clientId, canManage }: { contacts: ClientContact[]; clientId: string; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClientContact | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      designation: form.get('designation') || undefined,
      email: form.get('email') || undefined,
      phone: form.get('phone') || undefined,
      whatsapp: form.get('whatsapp') || undefined,
      preferredContactMethod: form.get('preferredContactMethod') || undefined,
      isDecisionMaker: form.get('isDecisionMaker') === 'on',
      isPrimary: form.get('isPrimary') === 'on',
      notes: form.get('notes') || undefined,
    };
    const isNew = editing === 'new';
    const url = isNew ? `/api/clients/${clientId}/contacts` : `/api/clients/${clientId}/contacts/${(editing as ClientContact).id}`;
    try {
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save contact');
      router.refresh();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(contact: ClientContact) {
    if (!window.confirm(`Remove contact "${contact.name}"?`)) return;
    await fetch(`/api/clients/${clientId}/contacts/${contact.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Every point of contact at this client — not limited to one person.</p>
        {canManage && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus size={14} /> Add Contact
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No contacts added yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-text">
                    {c.name}
                    {c.isPrimary && <Star size={13} className="text-amber-500" />}
                    {c.isDecisionMaker && <ShieldCheck size={13} className="text-primary" />}
                  </div>
                  {c.designation && <div className="text-xs text-muted">{c.designation}</div>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditing(c)} className="text-muted hover:text-primary">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => handleDelete(c)} className="text-muted hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-0.5 text-sm text-muted">
                {c.email && <div>{c.email}</div>}
                {c.phone && <div>{c.phone}</div>}
                {c.whatsapp && <div>WhatsApp: {c.whatsapp}</div>}
                {c.preferredContactMethod && <div>Prefers: {c.preferredContactMethod}</div>}
              </div>
              {c.notes && <p className="mt-2 text-sm text-muted">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Panel open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title={editing === 'new' ? 'Add contact' : 'Edit contact'}>
        {editing && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorText>{error}</ErrorText>}
            <FieldRow>
              <Field label="Name" htmlFor="name">
                <Input id="name" name="name" defaultValue={editing !== 'new' ? editing.name : ''} required />
              </Field>
              <Field label="Designation" htmlFor="designation">
                <Input id="designation" name="designation" defaultValue={editing !== 'new' ? editing.designation ?? '' : ''} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={editing !== 'new' ? editing.email ?? '' : ''} />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" defaultValue={editing !== 'new' ? editing.phone ?? '' : ''} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="WhatsApp" htmlFor="whatsapp">
                <Input id="whatsapp" name="whatsapp" defaultValue={editing !== 'new' ? editing.whatsapp ?? '' : ''} />
              </Field>
              <Field label="Preferred contact method" htmlFor="preferredContactMethod">
                <Input id="preferredContactMethod" name="preferredContactMethod" defaultValue={editing !== 'new' ? editing.preferredContactMethod ?? '' : ''} />
              </Field>
            </FieldRow>
            <div className="flex gap-4">
              <CheckboxLabel name="isPrimary" defaultChecked={editing !== 'new' ? editing.isPrimary : false}>
                Primary contact
              </CheckboxLabel>
              <CheckboxLabel name="isDecisionMaker" defaultChecked={editing !== 'new' ? editing.isDecisionMaker : false}>
                Decision maker
              </CheckboxLabel>
            </div>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={editing !== 'new' ? editing.notes ?? '' : ''} className="min-h-16" />
            </Field>
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Saving…' : editing === 'new' ? 'Add contact' : 'Save changes'}
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
