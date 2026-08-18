'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, Select, Textarea, ErrorText } from '@/components/ui/field';
import { Pill } from '@/components/ui/pill';
import { NOTE_CATEGORIES } from '@/lib/client-constants';
import type { ClientNote } from '../../types';

const CATEGORY_TONE: Record<string, 'badgeGreen' | 'badgeRed' | 'badgeYellow' | 'badgeGray' | 'badgeBlue'> = {
  warning: 'badgeRed',
  important: 'badgeYellow',
  strategy: 'badgeBlue',
  preference: 'badgeGreen',
};

export function NotesTab({ notes, clientId, currentUserId, canManage }: { notes: ClientNote[]; clientId: string; currentUserId: string; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClientNote | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = { category: form.get('category'), content: form.get('content') };
    const isNew = editing === 'new';
    const url = isNew ? `/api/clients/${clientId}/notes` : `/api/clients/${clientId}/notes/${(editing as ClientNote).id}`;
    try {
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save note');
      router.refresh();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(note: ClientNote) {
    if (!window.confirm('Delete this note?')) return;
    await fetch(`/api/clients/${clientId}/notes/${note.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Internal only — these notes are never visible outside the HRMS.</p>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus size={14} /> Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No notes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => {
            const canEdit = canManage || n.createdBy === currentUserId;
            return (
              <div key={n.id} className="rounded-md border border-border bg-surface p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <Pill tone={CATEGORY_TONE[n.category] ?? 'badgeGray'}>{n.category}</Pill>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {new Date(n.createdAt).toLocaleDateString()}
                    {canEdit && (
                      <>
                        <button type="button" onClick={() => setEditing(n)} className="text-muted hover:text-primary">
                          <Pencil size={13} />
                        </button>
                        <button type="button" onClick={() => handleDelete(n)} className="text-muted hover:text-danger">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-text">{n.content}</p>
              </div>
            );
          })}
        </div>
      )}

      <Panel open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title={editing === 'new' ? 'Add note' : 'Edit note'}>
        {editing && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorText>{error}</ErrorText>}
            <Field label="Category" htmlFor="category">
              <Select id="category" name="category" defaultValue={editing !== 'new' ? editing.category : 'general'}>
                {NOTE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note" htmlFor="content">
              <Textarea id="content" name="content" defaultValue={editing !== 'new' ? editing.content : ''} className="min-h-28" required />
            </Field>
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Saving…' : editing === 'new' ? 'Add note' : 'Save changes'}
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
