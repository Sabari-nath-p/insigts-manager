import { cn } from '@/lib/cn';
import { statusBadgeKey, statusLabel, type BadgeKey } from '@/lib/attendance-format';

const COLOR_VARS: Record<BadgeKey, { bg: string; text: string }> = {
  badgeGreen: { bg: 'var(--badge-green-bg)', text: 'var(--badge-green-text)' },
  badgeRed: { bg: 'var(--badge-red-bg)', text: 'var(--badge-red-text)' },
  badgeYellow: { bg: 'var(--badge-yellow-bg)', text: 'var(--badge-yellow-text)' },
  badgeGray: { bg: 'var(--badge-gray-bg)', text: 'var(--badge-gray-text)' },
  badgeBlue: { bg: 'var(--badge-blue-bg)', text: 'var(--badge-blue-text)' },
};

export function Pill({
  tone = 'badgeGray',
  children,
  className,
}: {
  tone?: BadgeKey;
  children: React.ReactNode;
  className?: string;
}) {
  const colors = COLOR_VARS[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        className,
      )}
      style={{ background: colors.bg, color: colors.text }}
    >
      {children}
    </span>
  );
}

/** Status pill for attendance record statuses, using the shared status→color/label mapping. */
export function AttendanceStatusPill({ status }: { status: string }) {
  return <Pill tone={statusBadgeKey(status)}>{statusLabel(status)}</Pill>;
}

const LEAVE_TONE: Record<string, BadgeKey> = {
  approved: 'badgeGreen',
  pending: 'badgeYellow',
  rejected: 'badgeRed',
  unpaid: 'badgeGray',
};

/** Status pill for leave request statuses (approved / pending / rejected / unpaid). */
export function LeaveStatusPill({ status }: { status: string }) {
  return <Pill tone={LEAVE_TONE[status] ?? 'badgeGray'}>{status}</Pill>;
}

const LEAVE_TYPE_VARS: Record<string, { bg: string; text: string }> = {
  paid: { bg: 'var(--tile-purple-bg)', text: 'var(--tile-purple-text)' },
  medical: { bg: 'var(--tile-teal-bg)', text: 'var(--tile-teal-text)' },
  unpaid: { bg: 'var(--tile-gray-bg)', text: 'var(--tile-gray-text)' },
};

/** Leave-type tag (paid / medical / unpaid) — distinct color family from status pills, Notion select-property style. */
export function LeaveTypePill({ type }: { type: string }) {
  const colors = LEAVE_TYPE_VARS[type] ?? LEAVE_TYPE_VARS.unpaid;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
      style={{ background: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}

const WORK_LOG_TONE: Record<string, BadgeKey> = {
  draft: 'badgeGray',
  submitted: 'badgeBlue',
  reviewed: 'badgeGreen',
  returned: 'badgeYellow',
};

const WORK_LOG_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  returned: 'Needs update',
};

/** Status pill for Daily Work Log statuses (draft / submitted / reviewed / returned). */
export function WorkLogStatusPill({ status }: { status: string }) {
  return <Pill tone={WORK_LOG_TONE[status] ?? 'badgeGray'}>{WORK_LOG_LABEL[status] ?? status}</Pill>;
}
