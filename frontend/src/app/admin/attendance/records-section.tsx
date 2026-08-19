import Link from 'next/link';
import { Table, Thead, Th, Tr, Td, TableWrap, EmptyState } from '@/components/ui/table';
import { AttendanceStatusPill } from '@/components/ui/pill';
import { formatMinutes, formatScheduledTime, formatTime } from '@/lib/attendance-format';
import { EditAttendanceButton } from './edit-attendance-button';
import { LiveWorkedMinutes } from './live-worked-minutes';

export interface RecordRow {
  recordId: string | null;
  userId: string;
  fullName: string;
  role: string;
  department: string | null;
  date: string;
  scheduledStartTime: string | null;
  checkInAt: string | null;
  lateMinutes: number;
  scheduledEndTime: string | null;
  checkOutAt: string | null;
  earlyCheckoutMinutes: number;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  status: string;
}

/** Detailed per-day audit table — one row per employee per day in the selected range. */
export function RecordsSection({ items }: { items: RecordRow[] }) {
  return (
    <TableWrap>
      <Table>
        <Thead sticky>
          <Th>Employee</Th>
          <Th>Role</Th>
          <Th>Date</Th>
          <Th>Scheduled in</Th>
          <Th>Clock in</Th>
          <Th>Late</Th>
          <Th>Scheduled out</Th>
          <Th>Clock out</Th>
          <Th>Early</Th>
          <Th>Break</Th>
          <Th>Worked</Th>
          <Th>Overtime</Th>
          <Th>Status</Th>
          <Th />
        </Thead>
        <tbody>
          {items.map((r) => (
            <Tr key={`${r.userId}:${r.date}`}>
              <Td>
                <Link href={`/admin/attendance/${r.userId}`} className="font-medium text-text hover:text-primary">
                  {r.fullName}
                </Link>
              </Td>
              <Td className="capitalize text-muted">{r.role.replace('_', ' ')}</Td>
              <Td>{r.date}</Td>
              <Td className="text-muted">{formatScheduledTime(r.scheduledStartTime)}</Td>
              <Td>{formatTime(r.checkInAt)}</Td>
              <Td className="text-muted">{r.lateMinutes > 0 ? formatMinutes(r.lateMinutes) : 'No'}</Td>
              <Td className="text-muted">{formatScheduledTime(r.scheduledEndTime)}</Td>
              <Td>{formatTime(r.checkOutAt)}</Td>
              <Td className="text-muted">{r.earlyCheckoutMinutes > 0 ? formatMinutes(r.earlyCheckoutMinutes) : 'No'}</Td>
              <Td className="text-muted">{formatMinutes(r.breakMinutes)}</Td>
              <Td>
                <LiveWorkedMinutes
                  checkInAt={r.checkInAt}
                  breakMinutes={r.breakMinutes}
                  isLive={r.status === 'currently_working'}
                  initialMinutes={r.workedMinutes}
                />
              </Td>
              <Td className="text-muted">{formatMinutes(r.overtimeMinutes)}</Td>
              <Td>
                <AttendanceStatusPill status={r.status} />
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
      {items.length === 0 && <EmptyState>No attendance records match these filters.</EmptyState>}
    </TableWrap>
  );
}
