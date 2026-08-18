'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Download, ExternalLink, FileIcon, Link as LinkIcon, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, FieldRow, Input, Select, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { ASSET_FOLDERS } from '@/lib/client-constants';
import type { ClientAsset } from '../../types';

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetsTab({ assets, clientId, canManage, currentUserId }: { assets: ClientAsset[]; clientId: string; canManage: boolean; currentUserId: string }) {
  const router = useRouter();
  const [folder, setFolder] = useState('');
  const [mode, setMode] = useState<'upload' | 'link' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const folders = useMemo(() => Array.from(new Set([...ASSET_FOLDERS, ...assets.map((a) => a.folder)])), [assets]);
  const filtered = folder ? assets.filter((a) => a.folder === folder) : assets;

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[name="file"]');
    const file = fileInput?.files?.[0];
    try {
      if (!file) throw new Error('Choose a file to upload');
      const body = new FormData(form);
      const res = await fetch(`/api/clients/${clientId}/assets/upload`, { method: 'POST', body });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to upload asset');
      router.refresh();
      setMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      folder: form.get('folder'),
      description: form.get('description') || undefined,
      tags: String(form.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      externalUrl: form.get('externalUrl'),
      isRestricted: form.get('isRestricted') === 'on',
    };
    try {
      const res = await fetch(`/api/clients/${clientId}/assets/link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to link asset');
      router.refresh();
      setMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(asset: ClientAsset) {
    if (!window.confirm(`Delete asset "${asset.name}"?`)) return;
    await fetch(`/api/clients/${clientId}/assets/${asset.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none">
          <option value="">All folders</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMode('link')}>
            <LinkIcon size={14} /> Link asset
          </Button>
          <Button size="sm" onClick={() => setMode('upload')}>
            <Plus size={14} /> Upload Asset
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No assets in this folder yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-tint text-primary-dark">
                  {a.kind === 'link' ? <LinkIcon size={14} /> : <FileIcon size={14} />}
                </div>
                {a.isRestricted && <Lock size={13} className="text-muted" />}
              </div>
              <div className="font-medium text-text">{a.name}</div>
              <div className="text-xs text-muted">
                {a.folder}
                {a.fileMimeType ? ` · ${a.fileMimeType.split('/').pop()}` : ''}
                {a.fileSize ? ` · ${formatFileSize(a.fileSize)}` : ''}
              </div>
              {a.description && <p className="text-sm text-muted">{a.description}</p>}
              {a.tags && a.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs text-muted">
                  {a.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex items-center gap-3 pt-1">
                {a.kind === 'link' ? (
                  <a href={a.externalUrl ?? '#'} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark">
                    <ExternalLink size={13} /> Open
                  </a>
                ) : (
                  <>
                    <a href={`/api/clients/${clientId}/assets/${a.id}/file`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:text-primary-dark">
                      Open
                    </a>
                    <a href={`/api/clients/${clientId}/assets/${a.id}/file?download=true`} className="flex items-center gap-1 text-sm font-medium text-muted hover:text-text">
                      <Download size={13} /> Download
                    </a>
                  </>
                )}
                {(canManage || a.uploadedBy === currentUserId) && (
                  <button type="button" onClick={() => handleDelete(a)} className="ml-auto text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Panel open={mode === 'upload'} onOpenChange={(open) => !open && setMode(null)} title="Upload asset">
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="Name" htmlFor="asset-name">
            <Input id="asset-name" name="name" required />
          </Field>
          <Field label="Folder" htmlFor="asset-folder">
            <Select id="asset-folder" name="folder" defaultValue="Other">
              {ASSET_FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="asset-description">
            <Textarea id="asset-description" name="description" className="min-h-12" />
          </Field>
          <Field label="Tags" htmlFor="asset-tags" hint="Comma-separated">
            <Input id="asset-tags" name="tags" />
          </Field>
          <Field label="Version" htmlFor="asset-version">
            <Input id="asset-version" name="version" placeholder="e.g. v2" />
          </Field>
          <Field label="File" htmlFor="file">
            <input id="file" name="file" type="file" required className="w-full text-sm text-text" />
          </Field>
          <CheckboxLabel name="isRestricted">Restricted (only account manager / super admin can view)</CheckboxLabel>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Uploading…' : 'Upload asset'}
          </Button>
        </form>
      </Panel>

      <Panel open={mode === 'link'} onOpenChange={(open) => !open && setMode(null)} title="Link asset">
        <form onSubmit={handleLink} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="Name" htmlFor="link-name">
            <Input id="link-name" name="name" required />
          </Field>
          <Field label="Folder" htmlFor="link-folder">
            <Select id="link-folder" name="folder" defaultValue="Other">
              {ASSET_FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="URL" htmlFor="externalUrl" hint="Google Drive, OneDrive, Dropbox, Figma, Canva, or any other link">
            <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" required />
          </Field>
          <Field label="Description" htmlFor="link-description">
            <Textarea id="link-description" name="description" className="min-h-12" />
          </Field>
          <Field label="Tags" htmlFor="link-tags" hint="Comma-separated">
            <Input id="link-tags" name="tags" />
          </Field>
          <CheckboxLabel name="isRestricted">Restricted (only account manager / super admin can view)</CheckboxLabel>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Saving…' : 'Link asset'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
