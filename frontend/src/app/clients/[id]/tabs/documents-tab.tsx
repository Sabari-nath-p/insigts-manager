'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Download, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Field, Input, Select, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import { DOCUMENT_CATEGORIES } from '@/lib/client-constants';
import type { ClientDocument } from '../../types';

export function DocumentsTab({ documents, clientId, canManage }: { documents: ClientDocument[]; clientId: string; canManage: boolean }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[name="file"]');
    try {
      if (!fileInput?.files?.[0]) throw new Error('Choose a file to upload');
      const body = new FormData(form);
      const res = await fetch(`/api/clients/${clientId}/documents`, { method: 'POST', body });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to upload document');
      router.refresh();
      setUploading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(doc: ClientDocument) {
    if (!window.confirm(`Delete document "${doc.name}"?`)) return;
    await fetch(`/api/clients/${clientId}/documents/${doc.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Contracts, agreements, proposals, invoices, and reports. Confidential documents stay hidden from employees without access.</p>
        {canManage && (
          <Button size="sm" onClick={() => setUploading(true)}>
            <Plus size={14} /> Upload Document
          </Button>
        )}
      </div>

      <TableWrap>
        <Table>
          <Thead>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Version</Th>
            <Th>Last modified</Th>
            <Th />
          </Thead>
          <tbody>
            {documents.map((d) => (
              <Tr key={d.id}>
                <Td className="font-medium text-text">
                  <span className="flex items-center gap-1.5">
                    {d.name}
                    {d.isConfidential && <Lock size={12} className="text-muted" />}
                  </span>
                  {d.description && <div className="text-xs text-muted">{d.description}</div>}
                </Td>
                <Td>
                  <Pill tone="badgeGray">{d.category}</Pill>
                </Td>
                <Td className="text-muted">{d.version ?? '—'}</Td>
                <Td className="text-muted">{new Date(d.updatedAt).toLocaleDateString()}</Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-3">
                    <a href={`/api/clients/${clientId}/documents/${d.id}/file?download=true`} className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark">
                      <Download size={13} /> Download
                    </a>
                    {canManage && (
                      <button type="button" onClick={() => handleDelete(d)} className="text-muted hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {documents.length === 0 && <EmptyState>No documents uploaded yet.</EmptyState>}
      </TableWrap>

      <Panel open={uploading} onOpenChange={setUploading} title="Upload document">
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          {error && <ErrorText>{error}</ErrorText>}
          <Field label="Name" htmlFor="doc-name">
            <Input id="doc-name" name="name" required />
          </Field>
          <Field label="Category" htmlFor="doc-category">
            <Select id="doc-category" name="category" defaultValue="other">
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Version" htmlFor="doc-version">
            <Input id="doc-version" name="version" placeholder="e.g. v2" />
          </Field>
          <Field label="Description" htmlFor="doc-description">
            <Textarea id="doc-description" name="description" className="min-h-12" />
          </Field>
          <Field label="File" htmlFor="doc-file">
            <input id="doc-file" name="file" type="file" required className="w-full text-sm text-text" />
          </Field>
          <CheckboxLabel name="isConfidential">Confidential (only account manager / super admin can view or download)</CheckboxLabel>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Uploading…' : 'Upload document'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
