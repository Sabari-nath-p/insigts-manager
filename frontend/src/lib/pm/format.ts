import type { Priority } from './types';

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

/** Solid colours for the priority marker; status colours are used only for status. */
export const PRIORITY_COLOR: Record<Priority, string> = {
  low: '#9b9b9b',
  medium: '#0075de',
  high: '#dd5b00',
  urgent: '#e03131',
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(due: string | null, done: boolean): boolean {
  return !!due && !done && due < todayIso();
}

export function formatDue(due: string): string {
  const d = new Date(`${due}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Fractional position between two neighbours; mirrors the server so optimistic order matches. */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000;
  if (before === null) return (after as number) - 1000;
  if (after === null) return before + 1000;
  return (before + after) / 2;
}

export function activityText(type: string, meta: Record<string, unknown> | null): string {
  const m = meta ?? {};
  switch (type) {
    case 'task.created':
      return 'created this task';
    case 'task.moved':
      return `moved it from ${m.from} to ${m.to}`;
    case 'task.assigned':
      return m.to ? 'changed the assignee' : 'removed the assignee';
    case 'task.completed':
      return 'completed it';
    case 'update.posted':
      return 'posted an update';
    case 'due.changed':
      return m.to ? `set the due date to ${formatDue(String(m.to))}` : 'cleared the due date';
    case 'priority.changed':
      return `changed priority to ${m.to}`;
    default:
      return type;
  }
}
