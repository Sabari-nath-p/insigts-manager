import Link from 'next/link';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { AttendanceStatusPill } from '@/components/ui/pill';
import { formatTime } from '@/lib/attendance-format';
import { EditAttendanceButton } from './edit-attendance-button';
import { LiveWorkedMinutes } from './live-worked-minutes';

export interface OverviewRow {
  recordId: string | null;
  userId: string;
  date: string;
  fullName: string;
  role: string;
  department: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  breakMinutes: number;
  workedMinutes: number;
  status: string;
}

/** Employee-centric snapshot for a single day — one row per employee, the default landing tab. */
export function OverviewSection({ items }: { items: OverviewRow[] }) {
  return (
    <TableWrap>
      <Table>
        <Thead sticky>
          <Th>Employee</Th>
          <Th>Role</Th>
          <Th>Status</Th>
          <Th>Clock in</Th>
          <Th>Clock out</Th>
          <Th>Worked</Th>
          <Th />
        </Thead>
        <tbody>
          {items.map((r) => (
            <Tr key={r.userId}>
              <Td>
                <Link href={`/admin/attendance/${r.userId}`} className="font-medium text-text hover:text-primary">
                  {r.fullName}
                </Link>
              </Td>
              <Td className="capitalize text-muted">{r.role.replace('_', ' ')}</Td>
              <Td>
                <AttendanceStatusPill status={r.status} />
              </Td>
              <Td>{formatTime(r.checkInAt)}</Td>
              <Td>{formatTime(r.checkOutAt)}</Td>
              <Td>
                <LiveWorkedMinutes
                  checkInAt={r.checkInAt}
                  breakMinutes={r.breakMinutes}
                  isLive={r.status === 'currently_working'}
                  initialMinutes={r.workedMinutes}
                />
              </Td>
              <Td align="right">
                {r.recordId && (
                  <EditAttendanceButton
                    recordId={r.recordId}
                    date={r.date}
                    checkInAt={r.checkInAt}
                    checkOutAt={r.checkOutAt}
                    breakMinutes={r.breakMinutes}
                  />
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {items.length === 0 && <EmptyState>No employees match these filters.</EmptyState>}
    </TableWrap>
  );
}
