'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Input, Textarea, ErrorText } from '@/components/ui/field';
import { Button, LinkButton } from '@/components/ui/button';
import { HolidayForm } from './holiday-form';

type PanelKind = 'add' | 'import' | 'duplicate' | null;

export function HolidayToolbar({ departments }: { departments: string[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<PanelKind>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const file = form.get('file') as File | null;
    const csv = file && file.size > 0 ? await file.text() : (form.get('csv') as string);
    if (!csv || !csv.trim()) {
      setError('Provide a CSV file or paste CSV content');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/attendance/holidays/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to import holidays');
      }
      setMessage(
        `Imported ${data.created} holiday(s), skipped ${data.skipped} duplicate(s).${data.errors?.length ? ` ${data.errors.length} row(s) had errors.` : ''}`,
      );
      router.refresh();
      setPanel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/attendance/holidays/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceYear: Number(form.get('sourceYear')),
          targetYear: Number(form.get('targetYear')),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to duplicate holidays');
      }
      setMessage(`Copied ${data.created.length} holiday(s), skipped ${data.skipped} that already existed.`);
      router.refresh();
      setPanel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreDefaults() {
    if (!window.confirm('Restore the default holiday calendar? Existing holidays on the same dates are kept as-is.')) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/attendance/holidays/restore-defaults', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to restore default holidays');
      }
      setMessage(`Restored ${data.created} default holiday(s), skipped ${data.skipped} already present.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {message && !error && (
        <div className="mb-3 rounded-md px-3 py-2 text-sm" style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}>
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setPanel(panel === 'add' ? null : 'add')}>
          Add holiday
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setPanel(panel === 'import' ? null : 'import')}>
          Import
        </Button>
        <LinkButton href="/api/attendance/holidays/export" variant="secondary" size="sm">
          Export
        </LinkButton>
        <Button size="sm" variant="secondary" onClick={() => setPanel(panel === 'duplicate' ? null : 'duplicate')}>
          Duplicate for another year
        </Button>
        <Button size="sm" variant="secondary" onClick={handleRestoreDefaults} disabled={loading}>
          Restore default calendar
        </Button>
      </div>

      {panel === 'add' && <HolidayForm holiday={null} departments={departments} onDone={() => setPanel(null)} />}

      {panel === 'import' && (
        <div className="my-3 rounded-md border border-border p-4">
          <form onSubmit={handleImport} className="flex flex-col gap-4">
            <Field label="CSV file" htmlFor="import-file">
              <Input id="import-file" name="file" type="file" accept=".csv,text/csv" />
            </Field>
            <Field label="…or paste CSV content" htmlFor="import-csv">
              <Textarea
                id="import-csv"
                name="csv"
                placeholder="date,name,type,description,isPaid,isOptional,isTentative,applicableDepartments,isActive"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Importing…' : 'Import holidays'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPanel(null)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {panel === 'duplicate' && (
        <div className="my-3 rounded-md border border-border p-4">
          <form onSubmit={handleDuplicate} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Copy holidays from year" htmlFor="sourceYear">
                <Input id="sourceYear" name="sourceYear" type="number" defaultValue={new Date().getFullYear()} required />
              </Field>
              <Field label="Into year" htmlFor="targetYear">
                <Input id="targetYear" name="targetYear" type="number" defaultValue={new Date().getFullYear() + 1} required />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Copying…' : 'Duplicate holidays'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPanel(null)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
