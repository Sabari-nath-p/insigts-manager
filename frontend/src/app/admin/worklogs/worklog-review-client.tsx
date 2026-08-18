'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { WorkLogStatusPill } from '@/components/ui/pill';
import { Panel } from '@/components/ui/panel';
import { PropertyList, PropertyRow } from '@/components/ui/property-row';
import { Button } from '@/components/ui/button';
import { Textarea, ErrorText } from '@/components/ui/field';
import { formatDate } from '@/lib/attendance-format';

export interface ReviewableWorkLog {
  id: string;
  userId: string;
  employeeName: string;
  employeeDepartment: string | null;
  date: string;
  tasksCompleted: string;
  blockers: string | null;
  totalHoursWorked: string | null;
  meetingSummary: string | null;
  status: 'submitted' | 'reviewed' | 'returned';
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
}

export function WorkLogReviewClient({ logs }: { logs: ReviewableWorkLog[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [viewing, setViewing] = useState<ReviewableWorkLog | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(logs.map((l) => l.employeeDepartment).filter((d): d is string => !!d))),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (q && !l.employeeName.toLowerCase().includes(q)) return false;
      if (department && l.employeeDepartment !== department) return false;
      return true;
    });
  }, [logs, query, department]);

  const submitted = filtered.filter((l) => l.status === 'submitted');
  const reviewed = filtered.filter((l) => l.status === 'reviewed');
  const returned = filtered.filter((l) => l.status === 'returned');

  function openLog(log: ReviewableWorkLog) {
    setViewing(log);
    setComment('');
    setError(null);
  }

  async function review(decision: 'reviewed' | 'returned') {
    if (!viewing) return;
    if (decision === 'returned' && !comment.trim()) {
      setError('Add a comment explaining what needs to change before returning this log.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/worklogs/${viewing.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to review this log');
      setViewing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function renderTable(rows: ReviewableWorkLog[]) {
    return (
      <TableWrap>
        <Table>
          <Thead>
            <Th>Employee</Th>
            <Th>Date</Th>
            <Th>Hours</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <tbody>
            {rows.map((l) => (
              <Tr key={l.id} onClick={() => openLog(l)}>
                <Td className="font-medium text-text">{l.employeeName}</Td>
                <Td>{formatDate(l.date)}</Td>
                <Td className="text-muted">{l.totalHoursWorked ? `${l.totalHoursWorked}h` : '—'}</Td>
                <Td>
                  <WorkLogStatusPill status={l.status} />
                </Td>
                <Td align="right">
                  <span className="text-sm font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
                    View
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {rows.length === 0 && <EmptyState>Nothing here.</EmptyState>}
      </TableWrap>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by employee name"
            className="w-48 bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
        </div>
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
      </div>

      <Tabs defaultValue="submitted">
        <TabsList>
          <TabsTrigger value="submitted">Awaiting review ({submitted.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
          <TabsTrigger value="returned">Returned ({returned.length})</TabsTrigger>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="submitted">{renderTable(submitted)}</TabsContent>
        <TabsContent value="reviewed">{renderTable(reviewed)}</TabsContent>
        <TabsContent value="returned">{renderTable(returned)}</TabsContent>
        <TabsContent value="all">{renderTable(filtered)}</TabsContent>
      </Tabs>

      <Panel open={!!viewing} onOpenChange={(open) => !open && setViewing(null)} title="Daily work log">
        {viewing && (
          <div className="flex flex-col gap-4">
            {error && <ErrorText>{error}</ErrorText>}
            <PropertyList>
              <PropertyRow label="Employee" value={viewing.employeeName} />
              <PropertyRow label="Department" value={viewing.employeeDepartment ?? '—'} />
              <PropertyRow label="Date" value={formatDate(viewing.date)} />
              <PropertyRow label="Hours worked" value={viewing.totalHoursWorked ? `${viewing.totalHoursWorked}h` : '—'} />
              <PropertyRow label="Status" value={<WorkLogStatusPill status={viewing.status} />} />
              <PropertyRow label="Tasks completed" value={<span className="whitespace-pre-wrap">{viewing.tasksCompleted}</span>} />
              <PropertyRow label="Blockers" value={viewing.blockers ? <span className="whitespace-pre-wrap">{viewing.blockers}</span> : '—'} />
              <PropertyRow label="Meeting summary" value={viewing.meetingSummary ? <span className="whitespace-pre-wrap">{viewing.meetingSummary}</span> : '—'} />
              {viewing.reviewComment && <PropertyRow label="Last review comment" value={viewing.reviewComment} />}
            </PropertyList>

            {viewing.status === 'submitted' && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Textarea
                  placeholder="Comment (required to return, optional to approve)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button disabled={loading} onClick={() => review('reviewed')}>
                    Mark reviewed
                  </Button>
                  <Button variant="secondary" disabled={loading} onClick={() => review('returned')}>
                    Return for update
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
