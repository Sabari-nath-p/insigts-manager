import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Field, Select, Input } from '@/components/ui/field';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { Pill } from '@/components/ui/pill';
import { LocalDate } from '@/components/ui/local-time';
import { LEAD_STATUSES, type Lead, type LeadSource, type SalesTeamMember } from '../types';
import { AGING_LABELS, STATUS_LABELS, STATUS_TONE, formatCurrency, formatDateOnly } from '@/lib/crm-format';
import { NewLeadPanel } from '../new-lead-panel';

interface UserSummary {
  id: string;
  fullName: string;
}

interface Filters {
  status?: string;
  setterId?: string;
  closerId?: string;
  leadSourceId?: string;
  search?: string;
}

export default async function LeadLogPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { token, user } = await requireSession();
  const filters = await searchParams;

  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) query.set(k, v);
  });

  const [leads, sources, team, users] = await Promise.all([
    apiFetch<Lead[]>(`/crm/leads?${query.toString()}`, { token }),
    apiFetch<LeadSource[]>('/crm/sources', { token }),
    apiFetch<SalesTeamMember[]>('/crm/team', { token }),
    apiFetch<UserSummary[]>('/users/team/status', { token }),
  ]);

  const nameById = new Map(users.map((u) => [u.id, u.fullName]));
  const setters = team.filter((t) => t.salesRole === 'setter');
  const closers = team.filter((t) => t.salesRole === 'closer');

  return (
    <AppShell user={user}>
      <PageHeader
        title="Lead Log"
        icon={ClipboardList}
        tone="purple"
        subtitle="Every lead, generated from the same records as the pipeline."
        actions={
          <>
            <a href="/api/crm/leads/export" className="text-xs font-medium text-primary hover:text-primary-dark self-center">
              Export CSV
            </a>
            <NewLeadPanel sources={sources} team={team} users={users} />
          </>
        }
      />

      <SectionTitle>Filters</SectionTitle>
      <form className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="Search" htmlFor="search">
            <Input id="search" name="search" placeholder="Name, company, email…" defaultValue={filters.search ?? ''} />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={filters.status ?? ''}>
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source" htmlFor="leadSourceId">
            <Select id="leadSourceId" name="leadSourceId" defaultValue={filters.leadSourceId ?? ''}>
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Setter" htmlFor="setterId">
            <Select id="setterId" name="setterId" defaultValue={filters.setterId ?? ''}>
              <option value="">All setters</option>
              {setters.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {nameById.get(t.userId) ?? t.userId}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Closer" htmlFor="closerId">
            <Select id="closerId" name="closerId" defaultValue={filters.closerId ?? ''}>
              <option value="">All closers</option>
              {closers.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {nameById.get(t.userId) ?? t.userId}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">
            Apply
          </button>
        </div>
      </form>

      <SectionTitle>{leads.length} lead(s)</SectionTitle>
      <TableWrap>
        <Table>
          <Thead sticky>
            <Th>Lead</Th>
            <Th>Source</Th>
            <Th>Setter</Th>
            <Th>Closer</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Meeting</Th>
            <Th align="right">Deal value</Th>
            <Th align="right">Earnings</Th>
            <Th>Next follow-up</Th>
            <Th>Aging</Th>
          </Thead>
          <tbody>
            {leads.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <Link href={`/crm/leads/${l.id}`} className="font-medium text-text hover:text-primary">
                    {l.leadName}
                  </Link>
                  {l.companyName && <span className="ml-2 text-xs text-muted">{l.companyName}</span>}
                </Td>
                <Td className="text-muted">{sources.find((s) => s.id === l.leadSourceId)?.name ?? '—'}</Td>
                <Td className="text-muted">{l.setterId ? nameById.get(l.setterId) ?? '—' : '—'}</Td>
                <Td className="text-muted">{l.closerId ? nameById.get(l.closerId) ?? '—' : '—'}</Td>
                <Td>
                  <Pill tone={STATUS_TONE[l.status]}>{STATUS_LABELS[l.status]}</Pill>
                </Td>
                <Td className="text-muted"><LocalDate iso={l.createdAt} /></Td>
                <Td className="text-muted">{formatDateOnly(l.meetingDate)}</Td>
                <Td align="right">{formatCurrency(l.dealValue)}</Td>
                <Td align="right">{formatCurrency(l.earnings)}</Td>
                <Td className="text-muted">{formatDateOnly(l.nextFollowUpDate)}</Td>
                <Td>
                  {l.agingStatus ? (
                    <span className="text-xs font-medium text-danger">{AGING_LABELS[l.agingStatus]}</span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {leads.length === 0 && <EmptyState>No leads match these filters.</EmptyState>}
      </TableWrap>
    </AppShell>
  );
}
