'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import type { BadgeKey } from '@/lib/attendance-format';

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  currentStatus: string;
}

const STATUS_FILTERS = [
  { value: 'working', label: 'Working' },
  { value: 'in_meeting', label: 'In a meeting' },
  { value: 'on_break', label: 'On a break' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'offline', label: 'Offline' },
];

const STATUS_TONE: Record<string, BadgeKey> = {
  working: 'badgeGreen',
  in_meeting: 'badgeBlue',
  on_break: 'badgeYellow',
  on_leave: 'badgeRed',
  offline: 'badgeGray',
};

export function TeamStatusList({ team }: { team: TeamMember[] }) {
  const [filter, setFilter] = useState<string | null>(null);

  const rows = useMemo(() => (filter ? team.filter((m) => m.currentStatus === filter) : team), [team, filter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            filter === null ? 'border-primary bg-primary-tint text-primary-dark' : 'border-border text-muted hover:text-text',
          )}
        >
          All
        </button>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setFilter(s.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === s.value ? 'border-primary bg-primary-tint text-primary-dark' : 'border-border text-muted hover:text-text',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <TableWrap>
        <Table>
          <Thead>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>Status</Th>
          </Thead>
          <tbody>
            {rows.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.fullName} size="sm" />
                    <span className="font-medium text-text">{m.fullName}</span>
                  </div>
                </Td>
                <Td className="capitalize text-muted">{m.role.replace('_', ' ')}</Td>
                <Td>
                  <Pill tone={STATUS_TONE[m.currentStatus] ?? 'badgeGray'}>{m.currentStatus.replace('_', ' ')}</Pill>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {rows.length === 0 && <EmptyState>No one matches this filter.</EmptyState>}
      </TableWrap>
    </div>
  );
}
