export type BadgeKey = 'badgeGreen' | 'badgeRed' | 'badgeYellow' | 'badgeGray' | 'badgeBlue';

export function statusBadgeKey(status: string): BadgeKey {
  switch (status) {
    case 'present':
      return 'badgeGreen';
    case 'currently_working':
    case 'on_leave':
    case 'holiday_worked':
    case 'week_off_worked':
      return 'badgeBlue';
    case 'late':
    case 'early_checkout':
      return 'badgeYellow';
    case 'late_and_early_checkout':
    case 'half_day':
    case 'not_checked_out':
    case 'absent':
      return 'badgeRed';
    case 'weekend':
    case 'holiday':
    default:
      return 'badgeGray';
  }
}

const STATUS_LABEL_OVERRIDES: Record<string, string> = {
  weekend: 'Week Off',
  holiday_worked: 'Holiday Worked',
  week_off_worked: 'Week Off Worked',
};

export function statusLabel(status: string): string {
  if (STATUS_LABEL_OVERRIDES[status]) return STATUS_LABEL_OVERRIDES[status];
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null) return '—';
  if (mins <= 0) return '0h';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatScheduledTime(hhmm: string | null | undefined): string {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Mirrors the backend's default-range resolution so table + analytics agree on "no filter given". */
export function resolveDateRange(params: { date?: string; from?: string; to?: string; month?: string }): {
  from: string;
  to: string;
} {
  if (params.date) return { from: params.date, to: params.date };
  if (params.from && params.to) return { from: params.from, to: params.to };
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}
