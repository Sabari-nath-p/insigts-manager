'use client';

import { useEffect, useState } from 'react';
import { ErrorText, Input } from '@/components/ui/field';
import { cc } from '@/lib/content-calendar/client';
import type { CcAccessUser } from '@/lib/content-calendar/types';
import { Modal } from './modal';

/** Super admins decide who may edit the content calendars. Everyone else can only view. */
export function AccessDialog({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<CcAccessUser[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    cc<CcAccessUser[]>('/access')
      .then(setUsers)
      .catch((e: Error) => setErr(e.message));
  }, []);

  async function toggle(u: CcAccessUser) {
    const next = !u.canEdit;
    setErr('');
    setUsers((list) => list && list.map((x) => (x.id === u.id ? { ...x, canEdit: next } : x)));
    try {
      await cc(`/access/${u.id}`, { method: 'PUT', body: { canEdit: next } });
    } catch (e) {
      setUsers((list) => list && list.map((x) => (x.id === u.id ? { ...x, canEdit: u.canEdit } : x)));
      setErr((e as Error).message);
    }
  }

  const text = q.trim().toLowerCase();
  const shown = (users ?? []).filter((u) => !text || u.fullName.toLowerCase().includes(text) || u.email.toLowerCase().includes(text));
  const editors = (users ?? []).filter((u) => u.canEdit).length;

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} eyebrow="Content calendar" title="Who can edit">
      <p className="text-sm text-muted">Everyone can view the calendars. Only the people ticked here can add, change or delete them.{users && ` ${editors} can edit now.`}</p>
      <Input aria-label="Search people" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <ErrorText>{err}</ErrorText>}
      {!users && !err && <p className="text-sm text-muted">Loading people&hellip;</p>}
      <ul className="-mt-1 flex max-h-[44vh] flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {shown.map((u) => (
          <li key={u.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]">
              <input type="checkbox" checked={u.canEdit} onChange={() => toggle(u)} className="h-4 w-4 accent-[color:var(--color-primary)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{u.fullName}</span>
                <span className="block truncate text-xs text-muted">{u.email}</span>
              </span>
            </label>
          </li>
        ))}
        {users && shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">No one matches.</li>}
      </ul>
    </Modal>
  );
}
