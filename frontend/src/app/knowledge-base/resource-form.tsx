'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FieldRow, Input, Select, Textarea, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { DEFAULT_CATEGORY_GROUPS, ALL_DEFAULT_CATEGORIES } from '@/lib/knowledge-categories';
import type { KnowledgeResource } from './types';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'super_admin', label: 'Super admin' },
];

export function ResourceForm({
  resource,
  departments,
  onSuccess,
}: {
  resource?: KnowledgeResource | null; // omitted/null = creating a new resource
  departments: string[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!resource;
  const [type, setType] = useState(resource?.type ?? 'document');
  const [content, setContent] = useState(resource?.content ?? '');
  const [visibility, setVisibility] = useState(resource?.visibility ?? 'all');
  const [allowedDepartments, setAllowedDepartments] = useState<string[]>(resource?.allowedDepartments ?? []);
  const [allowedRoles, setAllowedRoles] = useState<string[]>(resource?.allowedRoles ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'draft' | 'published' | null>(null);

  function toggleDepartment(dept: string) {
    setAllowedDepartments((prev) => (prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]));
  }
  function toggleRole(role: string) {
    setAllowedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSubmit(formEl: HTMLFormElement, status: 'draft' | 'published') {
    setError(null);
    setLoading(status);

    const form = new FormData(formEl);
    const tags = String(form.get('tags') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      let res: Response;

      if (!isEdit && type === 'file') {
        const fileInput = formEl.querySelector<HTMLInputElement>('input[name="file"]');
        const file = fileInput?.files?.[0];
        if (!file) throw new Error('Choose a file to upload');
        const body = new FormData();
        body.set('title', String(form.get('title') ?? ''));
        body.set('description', String(form.get('description') ?? ''));
        body.set('categoryGroup', String(form.get('categoryGroup') ?? ''));
        body.set('category', String(form.get('category') ?? ''));
        body.set('tags', tags.join(','));
        body.set('status', status);
        body.set('visibility', visibility);
        body.set('allowedDepartments', allowedDepartments.join(','));
        body.set('allowedRoles', allowedRoles.join(','));
        body.set('file', file);
        res = await fetch('/api/knowledge-base/resources/upload', { method: 'POST', body });
      } else {
        const payload: Record<string, unknown> = {
          title: form.get('title'),
          description: form.get('description') || undefined,
          categoryGroup: form.get('categoryGroup'),
          category: form.get('category'),
          tags,
          status,
          visibility,
          allowedDepartments,
          allowedRoles,
        };
        if (!isEdit) payload.type = type;
        if (type === 'document') payload.content = content;
        if (type === 'link') payload.externalUrl = form.get('externalUrl');

        res = await fetch(isEdit ? `/api/knowledge-base/resources/${resource!.id}` : '/api/knowledge-base/resources', {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || `Failed to ${isEdit ? 'save' : 'create'} resource`);
      }
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSubmit(e.currentTarget, 'draft');
      }}
      className="flex flex-col gap-4"
    >
      {error && <ErrorText>{error}</ErrorText>}

      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" defaultValue={resource?.title} required />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={resource?.description ?? ''} className="min-h-16" />
      </Field>

      <FieldRow>
        <Field label="Category group" htmlFor="categoryGroup" hint="Type a new one if it's not listed.">
          <Input
            id="categoryGroup"
            name="categoryGroup"
            list="kb-category-groups"
            defaultValue={resource?.categoryGroup}
            required
          />
          <datalist id="kb-category-groups">
            {DEFAULT_CATEGORY_GROUPS.map((g) => (
              <option key={g.group} value={g.group} />
            ))}
          </datalist>
        </Field>
        <Field label="Category" htmlFor="category">
          <Input id="category" name="category" list="kb-categories" defaultValue={resource?.category} required />
          <datalist id="kb-categories">
            {ALL_DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </FieldRow>

      <Field label="Tags" htmlFor="tags" hint="Comma-separated, e.g. policy, hr, leave">
        <Input id="tags" name="tags" defaultValue={resource?.tags?.join(', ') ?? ''} />
      </Field>

      <Field label="Resource type" htmlFor="type">
        <Select
          id="type"
          value={type}
          disabled={isEdit}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="document">Written policy / SOP</option>
          <option value="file">Uploaded file</option>
          <option value="link">External link</option>
        </Select>
      </Field>

      {type === 'document' && (
        <Field label="Content" htmlFor="content">
          <MarkdownEditor id="content" value={content} onChange={setContent} placeholder="Write the policy content in Markdown…" />
        </Field>
      )}

      {type === 'link' && (
        <Field label="External URL" htmlFor="externalUrl">
          <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" defaultValue={resource?.externalUrl ?? ''} required />
        </Field>
      )}

      {type === 'file' && !isEdit && (
        <Field label="File" htmlFor="file" hint="PDF, Word, Excel, PowerPoint, image, text, CSV, or ZIP — up to 20MB.">
          <input
            id="file"
            name="file"
            type="file"
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none file:mr-3 file:rounded file:border-0 file:bg-primary-tint file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary-dark"
          />
        </Field>
      )}
      {type === 'file' && isEdit && (
        <p className="text-sm text-muted">To replace the uploaded file, use “Replace file” from the resource view.</p>
      )}

      <Field label="Access" htmlFor="visibility">
        <Select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
          <option value="all">Available to all employees</option>
          <option value="restricted">Restricted to specific departments/roles</option>
        </Select>
      </Field>

      {visibility === 'restricted' && (
        <>
          <Field label="Departments" hint="Leave empty to not restrict by department.">
            {departments.length === 0 ? (
              <p className="text-sm text-muted">No departments configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {departments.map((dept) => (
                  <CheckboxLabel key={dept} checked={allowedDepartments.includes(dept)} onChange={() => toggleDepartment(dept)}>
                    {dept}
                  </CheckboxLabel>
                ))}
              </div>
            )}
          </Field>
          <Field label="Roles" hint="Leave empty to not restrict by role.">
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <CheckboxLabel key={r.value} checked={allowedRoles.includes(r.value)} onChange={() => toggleRole(r.value)}>
                  {r.label}
                </CheckboxLabel>
              ))}
            </div>
          </Field>
        </>
      )}

      <div className="mt-2 flex gap-2">
        <Button type="submit" variant="secondary" disabled={!!loading}>
          {loading === 'draft' ? 'Saving…' : 'Save as draft'}
        </Button>
        <Button
          type="button"
          disabled={!!loading}
          onClick={() => {
            const form = formRef.current;
            if (!form) return;
            if (!form.reportValidity()) return;
            handleSubmit(form, 'published');
          }}
        >
          {loading === 'published' ? 'Publishing…' : 'Publish'}
        </Button>
      </div>
    </form>
  );
}
