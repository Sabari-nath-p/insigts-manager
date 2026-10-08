'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Pill } from '@/components/ui/pill';
import type { BadgeKey } from '@/lib/attendance-format';
import { CreateClientForm } from './create-client-form';
import type { Client } from './types';

const STATUS_TONE: Record<string, BadgeKey> = {
  active: 'badgeGreen',
  onboarding: 'badgeBlue',
  paused: 'badgeYellow',
  completed: 'badgeGray',
  archived: 'badgeRed',
};

type SortKey = 'recent' | 'updated' | 'name' | 'services' | 'team';

export function ClientList({
  clients,
  employees,
  isSuperAdmin,
}: {
  clients: Client[];
  employees: { id: string; fullName: string; role: string }[];
  isSuperAdmin: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [industry, setIndustry] = useState('');
  const [accountManager, setAccountManager] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [creating, setCreating] = useState(false);

  const industries = useMemo(
    () => Array.from(new Set(clients.map((c) => c.industry).filter((v): v is string => !!v))),
    [clients],
  );
  const accountManagers = useMemo(
    () => Array.from(new Set(clients.map((c) => c.accountManagerName).filter((v): v is string => !!v))),
    [clients],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = clients.filter((c) => {
      if (status && c.status !== status) return false;
      if (industry && c.industry !== industry) return false;
      if (accountManager && c.accountManagerName !== accountManager) return false;
      if (q) {
        const haystack = [c.clientName, c.companyName ?? '', c.industry ?? '', c.accountManagerName ?? '', ...(c.serviceNames ?? [])]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) => a.clientName.localeCompare(b.clientName));
        break;
      case 'services':
        sorted.sort((a, b) => (b.activeServicesCount ?? 0) - (a.activeServicesCount ?? 0));
        break;
      case 'team':
        sorted.sort((a, b) => (b.teamSize ?? 0) - (a.teamSize ?? 0));
        break;
      case 'recent':
        sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        break;
      default:
        sorted.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    }
    return sorted;
  }, [clients, query, status, industry, accountManager, sortKey]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, industry, account manager, service…"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
        </div>
        {isSuperAdmin && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} />
            Add Client
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        {industries.length > 0 && (
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none">
            <option value="">All industries</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        )}
        {accountManagers.length > 0 && (
          <select value={accountManager} onChange={(e) => setAccountManager(e.target.value)} className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none">
            <option value="">All account managers</option>
            {accountManagers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="ml-auto rounded-md border border-border px-2.5 py-1.5 text-sm text-muted outline-none">
          <option value="updated">Sort: Recently updated</option>
          <option value="recent">Sort: Recently added</option>
          <option value="name">Sort: Name</option>
          <option value="services">Sort: Active services</option>
          <option value="team">Sort: Team size</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          {clients.length === 0 ? "No clients yet — add your first one to get started." : 'No clients match your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-tint text-primary-dark">
                  <Building2 size={18} />
                </div>
                <Pill tone={STATUS_TONE[c.status] ?? 'badgeGray'}>{c.status}</Pill>
              </div>
              <div>
                <div className="font-semibold leading-snug text-text">{c.clientName}</div>
                {c.industry && <div className="text-xs text-muted">{c.industry}{c.niche ? ` · ${c.niche}` : ''}</div>}
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted">
                <div>Account manager: {c.accountManagerName ?? '—'}</div>
                <div>
                  {c.activeServicesCount ?? 0} active service(s) · {c.teamSize ?? 0} team member(s)
                </div>
                {c.retainerPackage && <div>Package: {c.retainerPackage}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {isSuperAdmin && (
        <Panel open={creating} onOpenChange={setCreating} title="Add client" description="Basic information and initial contacts — everything else is filled in from the client workspace.">
          <CreateClientForm employees={employees} onSuccess={() => setCreating(false)} />
        </Panel>
      )}
    </div>
  );
}
