'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, Input, Select, Textarea, ErrorText } from '@/components/ui/field';
import { Pill } from '@/components/ui/pill';
import { LINK_CATEGORIES } from '@/lib/client-constants';
import type { ClientLink } from '../../types';

export function LinksTab({ links, clientId, canManage }: { links: ClientLink[]; clientId: string; canManage: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = { name: form.get('name'), url: form.get('url'), category: form.get('category'), description: form.get('description') || undefined };
    try {
      const res = await fetch(`/api/clients/${clientId}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to add link');
      router.refresh();
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(link: ClientLink) {
    if (!window.confirm(`Remove link "${link.name}"?`)) return;
    await fetch(`/api/clients/${clientId}/links/${link.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Important external links — website, socials, drives, ad accounts, and more.</p>
        {canManage && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add External Link
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No links saved yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{l.name}</span>
                  <Pill tone="badgeGray">{l.category}</Pill>
                </div>
                {l.description && <div className="truncate text-xs text-muted">{l.description}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={l.url} target="_blank" rel="noreferrer" className="text-muted hover:text-primary">
                  <ExternalLink size={15} />
                </a>
                {canManage && (
                  <button type="button" onClick={() => handleDelete(l)} className="text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Panel open={adding} onOpenChange={setAdding} title="Add external link">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="Name" htmlFor="link-name">
            <Input id="link-name" name="name" required />
          </Field>
          <Field label="URL" htmlFor="url">
            <Input id="url" name="url" type="url" placeholder="https://…" required />
          </Field>
          <Field label="Category" htmlFor="category">
            <Select id="category" name="category" defaultValue="Other">
              {LINK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" className="min-h-12" />
          </Field>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Saving…' : 'Add link'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
