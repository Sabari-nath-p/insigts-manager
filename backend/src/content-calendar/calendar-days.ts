export interface CalendarPost {
  id: string;
  type: string;
  note: string;
}

export interface CalendarDay {
  posts: CalendarPost[];
  marker: { label: string } | null;
}

export type CalendarDays = Record<string, CalendarDay>;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Trims the text and drops anything that is not part of a day, so only clean data is stored. */
export function cleanDay(input: { posts: CalendarPost[]; marker?: { label: string } | null }): CalendarDay {
  const posts = input.posts.map((p) => ({ id: p.id, type: p.type.trim(), note: p.note.trim() })).filter((p) => p.type);
  const label = input.marker?.label.trim();
  return { posts, marker: label ? { label } : null };
}

export const isEmptyDay = (d: CalendarDay) => d.posts.length === 0 && !d.marker;

/** The days object after replacing one day. An empty day is removed so the stored JSON stays small. */
export function withDay(days: CalendarDays, day: number, next: CalendarDay): CalendarDays {
  const copy = { ...days };
  if (isEmptyDay(next)) delete copy[String(day)];
  else copy[String(day)] = next;
  return copy;
}

/** Days that have plans but would not exist in the given month (e.g. the 31st in a 30-day month). */
export function daysBeyondMonth(days: CalendarDays, year: number, month: number): number[] {
  const last = daysInMonth(year, month);
  return Object.keys(days).map(Number).filter((d) => d > last).sort((a, b) => a - b);
}
