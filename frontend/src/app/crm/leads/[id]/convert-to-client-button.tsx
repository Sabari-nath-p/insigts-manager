'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/field';

export function ConvertToClientButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; clientName: string }> | null>(null);

  async function convert(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert-to-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to convert');
      if (data.possibleDuplicateClients) {
        setDuplicates(data.possibleDuplicateClients);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      {error && <ErrorText>{error}</ErrorText>}
      {duplicates && duplicates.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-text">A client with a matching company or email already exists:</p>
          <ul className="mb-3 flex flex-col gap-1">
            {duplicates.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <Link href={`/clients/${c.id}`} className="text-primary hover:text-primary-dark">
                  {c.clientName}
                </Link>
                <Button size="sm" variant="secondary" disabled={loading} onClick={() => convert({ linkToClientId: c.id })}>
                  Link to this client
                </Button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" disabled={loading} onClick={() => convert({ confirmCreateAnyway: true })}>
            Create a new client anyway
          </Button>
        </div>
      ) : (
        <Button size="sm" disabled={loading} onClick={() => convert({})}>
          {loading ? 'Converting…' : 'Convert to Client'}
        </Button>
      )}
    </div>
  );
}
