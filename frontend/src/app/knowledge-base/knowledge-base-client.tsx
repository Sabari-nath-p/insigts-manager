'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, FileText, Paperclip, Link as LinkIcon, Download, ExternalLink, Pencil, Archive, ArchiveRestore, Trash2, RefreshCw } from 'lucide-react';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { IconTile } from '@/components/ui/icon-tile';
import { ErrorText } from '@/components/ui/field';
import { MarkdownView } from '@/components/ui/markdown-view';
import { DEFAULT_CATEGORY_GROUPS } from '@/lib/knowledge-categories';
import { ResourceForm } from './resource-form';
import type { KnowledgeResource } from './types';

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeIcon(type: string) {
  if (type === 'document') return FileText;
  if (type === 'link') return LinkIcon;
  return Paperclip;
}

function ResourceCard({ resource, onOpen }: { resource: KnowledgeResource; onOpen: () => void }) {
  const Icon = typeIcon(resource.type);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <IconTile icon={Icon} tone="sky" />
        {resource.status !== 'published' && (
          <Pill tone={resource.status === 'draft' ? 'badgeYellow' : 'badgeGray'}>{resource.status}</Pill>
        )}
      </div>
      <div className="font-semibold leading-snug text-text">{resource.title}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone="badgeGray">{resource.category}</Pill>
        {resource.type === 'file' && resource.fileMimeType && (
          <span className="text-[11px] uppercase text-muted">{resource.fileMimeType.split('/').pop()}</span>
        )}
      </div>
      {resource.description && <p className="line-clamp-2 text-sm text-muted">{resource.description}</p>}
      <div className="mt-auto pt-1 text-xs text-muted">Updated {formatUpdated(resource.updatedAt)}</div>
    </button>
  );
}

export function KnowledgeBaseClient({
  resources,
  departments,
  isAdmin,
}: {
  resources: KnowledgeResource[];
  departments: string[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [department, setDepartment] = useState('');
  const [docType, setDocType] = useState('');
  const [recentOnly, setRecentOnly] = useState(false);

  const [viewing, setViewing] = useState<KnowledgeResource | null>(null);
  const [editing, setEditing] = useState<KnowledgeResource | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORY_GROUPS.map((g) => g.group), ...resources.map((r) => r.categoryGroup)])),
    [resources],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (group && r.categoryGroup !== group) return false;
      if (docType && r.type !== docType) return false;
      if (department && r.visibility === 'restricted' && !r.allowedDepartments?.includes(department)) return false;
      if (recentOnly && Date.now() - new Date(r.updatedAt).getTime() > RECENT_WINDOW_MS) return false;
      if (q) {
        const haystack = [r.title, r.description ?? '', r.category, r.categoryGroup, ...(r.tags ?? []), r.content ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [resources, query, group, docType, department, recentOnly]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)), [filtered]);
  const recent = sorted.slice(0, 5);

  function openResource(resource: KnowledgeResource) {
    setViewing(resource);
    setError(null);
  }

  async function setStatus(resource: KnowledgeResource, status: 'published' | 'archived' | 'draft') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-base/resources/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to update resource');
      setViewing(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(resource: KnowledgeResource) {
    if (!window.confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-base/resources/${resource.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to delete resource');
      }
      setViewing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleReplaceFile(resource: KnowledgeResource, file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch(`/api/knowledge-base/resources/${resource.id}/replace-file`, { method: 'POST', body });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to replace file');
      setViewing(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function renderDetailBody(resource: KnowledgeResource) {
    if (resource.type === 'document') {
      return <MarkdownView content={resource.content ?? ''} />;
    }
    if (resource.type === 'link') {
      return (
        <a
          href={resource.externalUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark"
        >
          <ExternalLink size={14} /> Open link
        </a>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{resource.fileName}</span>
          {resource.fileSize != null && <span>· {formatFileSize(resource.fileSize)}</span>}
        </div>
        <div className="overflow-hidden rounded-md border border-border bg-sidebar">
          <iframe src={`/api/knowledge-base/resources/${resource.id}/file`} title={resource.title} className="h-[420px] w-full" />
        </div>
        <a
          href={`/api/knowledge-base/resources/${resource.id}/file?download=true`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark"
        >
          <Download size={14} /> Download
        </a>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}

      <div className="mb-5 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5">
        <Search size={16} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search policies, SOPs, templates and company resources…"
          className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setGroup(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            group === null ? 'bg-primary text-white' : 'bg-black/[0.04] text-muted hover:text-text dark:bg-white/[0.06]'
          }`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              group === g ? 'bg-primary text-white' : 'bg-black/[0.04] text-muted hover:text-text dark:bg-white/[0.06]'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none"
        >
          <option value="">All types</option>
          <option value="document">Written policy / SOP</option>
          <option value="file">Uploaded file</option>
          <option value="link">External link</option>
        </select>
        {departments.length > 0 && (
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted">
          <input type="checkbox" checked={recentOnly} onChange={(e) => setRecentOnly(e.target.checked)} className="h-3.5 w-3.5" />
          Recently updated
        </label>
        {isAdmin && (
          <Button size="sm" className="ml-auto" onClick={() => setCreating(true)}>
            <Plus size={14} />
            Add Resource
          </Button>
        )}
      </div>

      {recent.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text">Recently Updated</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((r) => (
              <ResourceCard key={r.id} resource={r} onOpen={() => openResource(r)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text">All Resources ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nothing matches your search yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((r) => (
              <ResourceCard key={r.id} resource={r} onOpen={() => openResource(r)} />
            ))}
          </div>
        )}
      </div>

      <Panel open={!!viewing} onOpenChange={(open) => !open && setViewing(null)} title={viewing?.title ?? ''}>
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="badgeGray">{viewing.category}</Pill>
              {viewing.status !== 'published' && (
                <Pill tone={viewing.status === 'draft' ? 'badgeYellow' : 'badgeGray'}>{viewing.status}</Pill>
              )}
              {viewing.tags?.map((tag) => (
                <span key={tag} className="text-xs text-muted">
                  #{tag}
                </span>
              ))}
            </div>
            {viewing.description && <p className="text-sm text-muted">{viewing.description}</p>}
            <p className="text-xs text-muted">Last updated: {formatUpdated(viewing.updatedAt)}</p>

            {renderDetailBody(viewing)}

            {isAdmin && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(viewing)}>
                  <Pencil size={13} /> Edit
                </Button>
                {viewing.type === 'file' && (
                  <>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => replaceFileInputRef.current?.click()}>
                      <RefreshCw size={13} /> Replace file
                    </Button>
                    <input
                      ref={replaceFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleReplaceFile(viewing, file);
                        e.target.value = '';
                      }}
                    />
                  </>
                )}
                {viewing.status === 'archived' ? (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus(viewing, 'published')}>
                    <ArchiveRestore size={13} /> Restore
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus(viewing, 'archived')}>
                    <Archive size={13} /> Archive
                  </Button>
                )}
                <Button size="sm" variant="danger" disabled={busy} onClick={() => handleDelete(viewing)}>
                  <Trash2 size={13} /> Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>

      {isAdmin && (
        <Panel open={creating} onOpenChange={setCreating} title="Add resource" description="Publish a policy, SOP, template, or link for employees.">
          <ResourceForm departments={departments} onSuccess={() => setCreating(false)} />
        </Panel>
      )}

      {isAdmin && (
        <Panel open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title="Edit resource">
          {editing && (
            <ResourceForm
              resource={editing}
              departments={departments}
              onSuccess={() => {
                setEditing(null);
                setViewing(null);
              }}
            />
          )}
        </Panel>
      )}
    </div>
  );
}
