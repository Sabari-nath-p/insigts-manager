'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { LeaveStatusPill, LeaveTypePill } from '@/components/ui/pill';
import { Panel } from '@/components/ui/panel';
import { PropertyList, PropertyRow } from '@/components/ui/property-row';
import { ReviewButtons } from './review-buttons';

export interface LeaveRequest {
  id: string;
  userId: string;
  type: 'paid' | 'medical' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

export function LeaveRequestsClient({
  leaves,
  nameById,
}: {
  leaves: LeaveRequest[];
  nameById: Record<string, string>;
}) {
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);

  const pending = useMemo(() => leaves.filter((l) => l.status === 'pending'), [leaves]);
  const approved = useMemo(() => leaves.filter((l) => l.status === 'approved'), [leaves]);
  const rejected = useMemo(() => leaves.filter((l) => l.status === 'rejected'), [leaves]);

  function renderTable(rows: LeaveRequest[], withActions: boolean) {
    return (
      <TableWrap>
        <Table>
          <Thead>
            <Th>Employee</Th>
            <Th>Type</Th>
            <Th>Dates</Th>
            <Th align="right">Days</Th>
            <Th>Reason</Th>
            {withActions ? <Th>Action</Th> : <Th>Status</Th>}
            <Th />
          </Thead>
          <tbody>
            {rows.map((l) => (
              <Tr key={l.id}>
                <Td className="font-medium text-text">{nameById[l.userId] ?? l.userId}</Td>
                <Td>
                  <LeaveTypePill type={l.type} />
                </Td>
                <Td>
                  {l.startDate} → {l.endDate}
                </Td>
                <Td align="right">{l.days}</Td>
                <Td className="max-w-xs truncate text-muted">{l.reason}</Td>
                {withActions ? (
                  <Td>
                    <ReviewButtons leaveId={l.id} />
                  </Td>
                ) : (
                  <Td>
                    <LeaveStatusPill status={l.status} />
                  </Td>
                )}
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => setViewing(l)}
                    className="text-sm font-medium text-muted opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                  >
                    View
                  </button>
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
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          <TabsTrigger value="all">All ({leaves.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">{renderTable(pending, true)}</TabsContent>
        <TabsContent value="approved">{renderTable(approved, false)}</TabsContent>
        <TabsContent value="rejected">{renderTable(rejected, false)}</TabsContent>
        <TabsContent value="all">{renderTable(leaves, false)}</TabsContent>
      </Tabs>

      <Panel open={!!viewing} onOpenChange={(open) => !open && setViewing(null)} title="Leave request">
        {viewing && (
          <PropertyList>
            <PropertyRow label="Employee" value={nameById[viewing.userId] ?? viewing.userId} />
            <PropertyRow label="Type" value={<LeaveTypePill type={viewing.type} />} />
            <PropertyRow label="Dates" value={`${viewing.startDate} → ${viewing.endDate}`} />
            <PropertyRow label="Days" value={viewing.days} />
            <PropertyRow label="Status" value={<LeaveStatusPill status={viewing.status} />} />
            <PropertyRow label="Reason" value={viewing.reason} />
          </PropertyList>
        )}
      </Panel>
    </>
  );
}
