import { MONTHS } from '@/lib/content-calendar/logic';
import type { CcCalendar } from '@/lib/content-calendar/types';
import type { PmTask } from './types';

/** Special days (Onam, Diwali, ...) become tasks named with this prefix, e.g. "SPL-Onam". */
export const SPECIAL_PREFIX = 'SPL-';

export interface ImportRow {
  /** Stable id for ticking and "already created" bookkeeping. */
  key: string;
  title: string;
  /**
   * YYYY-MM-DD: the day the post goes out. This is when to POST, not when to do the work, so it is only shown for
   * reference (and written into the description); the task's own due date is left empty for people to set.
   */
  postDate: string;
  /** First line of the description, e.g. "Posting date: 9 Nov 2026". It is also how a repeat import spots existing tasks. */
  marker: string;
  description: string;
  special: boolean;
  /** A task like this is already in the project, so importing again would double it. */
  duplicate: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const longDate = (cal: Pick<CcCalendar, 'year' | 'month'>, day: number) => `${day} ${MONTHS[cal.month].slice(0, 3)} ${cal.year}`;

/**
 * One task per planned post, in date order, named by type and a running number ("Poster 1", "Poster 2",
 * "Carousel 1", ...), plus one "SPL-" task per special day. The project is the client, so the description holds
 * only the posting date and the post's details.
 */
export function rowsFromCalendar(cal: CcCalendar): ImportRow[] {
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  const rows: ImportRow[] = [];

  const days = Object.keys(cal.days).map(Number).sort((a, b) => a - b);
  for (const day of days) {
    const entry = cal.days[String(day)];
    const postDate = `${cal.year}-${pad(cal.month + 1)}-${pad(day)}`;
    if (entry.marker) {
      const marker = `Special day: ${longDate(cal, day)}`;
      rows.push({ key: `${day}:special`, title: `${SPECIAL_PREFIX}${entry.marker.label}`, postDate, marker, description: marker, special: true, duplicate: false });
    }
    for (const post of entry.posts) {
      const type = post.type.trim().toLowerCase();
      const n = (counts.get(type) ?? 0) + 1;
      counts.set(type, n);
      if (!names.has(type)) names.set(type, post.type.trim());
      const note = post.note.trim();
      const marker = `Posting date: ${longDate(cal, day)}`;
      rows.push({ key: `${day}:${post.id}`, title: `${names.get(type)} ${n}`, postDate, marker, description: note ? `${marker}\n\n${note}` : marker, special: false, duplicate: false });
    }
  }
  return rows;
}

/** Flags the rows that already exist in the project: the same title carrying the same posting-date line. */
export function markDuplicates(rows: ImportRow[], tasks: PmTask[]): ImportRow[] {
  return rows.map((r) => ({ ...r, duplicate: tasks.some((t) => t.title === r.title && (t.description ?? '').includes(r.marker)) }));
}
