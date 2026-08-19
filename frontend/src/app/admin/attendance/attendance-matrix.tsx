import Link from 'next/link';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/table';
import { statusBadgeKey, statusLabel } from '@/lib/attendance-format';

export interface MatrixRow {
  userId: string;
  fullName: string;
  role: string;
  department: string | null;
  cells: Array<{ status: string; lateMinutes: number }>;
}

const LEGEND_STATUSES = [
  'present',
  'late',
  'early_checkout',
  'half_day',
  'currently_working',
  'absent',
  'on_leave',
  'weekend',
  'holiday',
];

const BADGE_BG_VAR: Record<string, string> = {
  badgeGreen: 'var(--badge-green-bg)',
  badgeRed: 'var(--badge-red-bg)',
  badgeYellow: 'var(--badge-yellow-bg)',
  badgeGray: 'var(--badge-gray-bg)',
  badgeBlue: 'var(--badge-blue-bg)',
};

/** Monthly employee x day grid — one row per employee, one small colored cell per day. */
export function AttendanceMatrix({ items, days }: { items: MatrixRow[]; days: string[] }) {
  if (items.length === 0) {
    return <EmptyState>No employees match these filters.</EmptyState>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {LEGEND_STATUSES.map((s) => (
          <Pill key={s} tone={statusBadgeKey(s)}>
            {statusLabel(s)}
          </Pill>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border thin-scrollbar">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-40 border-b border-border bg-surface px-3 py-2 text-left text-xs font-semibold uppercase text-muted">
                Employee
              </th>
              {days.map((d) => (
                <th key={d} className="min-w-7 border-b border-border px-0.5 py-2 text-center text-[10px] font-semibold text-muted">
                  {Number(d.slice(8, 10))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.userId} className="border-b border-border last:border-b-0">
                <td className="sticky left-0 z-10 bg-surface px-3 py-2">
                  <Link href={`/admin/attendance/${row.userId}`} className="font-medium text-text hover:text-primary">
                    {row.fullName}
                  </Link>
                </td>
                {row.cells.map((cell, i) => (
                  <td key={days[i]} className="p-0.5 text-center">
                    <div
                      title={`${days[i]} — ${statusLabel(cell.status)}`}
                      className="mx-auto h-5 w-5 rounded"
                      style={{ background: BADGE_BG_VAR[statusBadgeKey(cell.status)] }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
