'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Textarea, ErrorText } from '@/components/ui/field';

async function post(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

export function RecordActions({
  recordId,
  status,
  hasExceptions,
  paymentStatus,
}: {
  recordId: string;
  status: string;
  hasExceptions: boolean;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [showReopen, setShowReopen] = useState(false);

  async function run(action: string, path: string, body?: unknown) {
    setLoading(action);
    setError(null);
    try {
      await post(path, body);
      router.refresh();
      setShowOverride(false);
      setShowReopen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  function handleFinalizeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = (new FormData(e.currentTarget).get('overrideReason') as string) || undefined;
    run('finalize', `/api/payroll/admin/records/${recordId}/finalize`, { overrideReason: reason });
  }

  function handleReopenSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = new FormData(e.currentTarget).get('reason') as string;
    run('reopen', `/api/payroll/admin/records/${recordId}/reopen`, { reason });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        {status === 'calculated' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={loading !== null}
            onClick={() => run('under-review', `/api/payroll/admin/records/${recordId}/under-review`)}
          >
            {loading === 'under-review' ? 'Submitting…' : 'Submit for review'}
          </Button>
        )}
        {(status === 'calculated' || status === 'under_review') && (
          <Button size="sm" disabled={loading !== null} onClick={() => run('approve', `/api/payroll/admin/records/${recordId}/approve`)}>
            {loading === 'approve' ? 'Approving…' : 'Approve'}
          </Button>
        )}
        {status === 'approved' && !hasExceptions && (
          <Button
            size="sm"
            disabled={loading !== null}
            onClick={() => run('finalize', `/api/payroll/admin/records/${recordId}/finalize`, {})}
          >
            {loading === 'finalize' ? 'Finalizing…' : 'Finalize'}
          </Button>
        )}
        {status === 'approved' && hasExceptions && (
          <Button size="sm" variant="danger" disabled={loading !== null} onClick={() => setShowOverride((v) => !v)}>
            Finalize with override
          </Button>
        )}
        {status === 'finalized' && paymentStatus === 'pending' && (
          <Button
            size="sm"
            disabled={loading !== null}
            onClick={() => run('mark-paid', `/api/payroll/admin/records/${recordId}/mark-paid`)}
          >
            {loading === 'mark-paid' ? 'Marking…' : 'Mark as paid'}
          </Button>
        )}
        {status === 'finalized' && (
          <Button size="sm" variant="secondary" disabled={loading !== null} onClick={() => setShowReopen((v) => !v)}>
            Reopen
          </Button>
        )}
      </div>

      {showOverride && (
        <form onSubmit={handleFinalizeSubmit} className="flex flex-col gap-2 rounded-md border border-danger/30 bg-danger-bg p-3">
          <Field label="Override reason (required — this record has unresolved exceptions)" htmlFor="overrideReason">
            <Textarea id="overrideReason" name="overrideReason" required rows={2} />
          </Field>
          <Button type="submit" size="sm" variant="danger" disabled={loading !== null}>
            {loading === 'finalize' ? 'Finalizing…' : 'Confirm override & finalize'}
          </Button>
        </form>
      )}

      {showReopen && (
        <form onSubmit={handleReopenSubmit} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <Field label="Reason for reopening" htmlFor="reason">
            <Textarea id="reason" name="reason" required rows={2} />
          </Field>
          <Button type="submit" size="sm" variant="secondary" disabled={loading !== null}>
            {loading === 'reopen' ? 'Reopening…' : 'Confirm reopen'}
          </Button>
        </form>
      )}
    </div>
  );
}
