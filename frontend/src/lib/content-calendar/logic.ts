import type { CcCalendar, CcDay } from './types';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** One-tap post types; anything else can still be typed. */
export const QUICK_TYPES = ['Video', 'Poster', 'Carousel'];

export const EMPTY_DAY: CcDay = { posts: [], marker: null };

export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 12));

export const monthKey = (c: { year: number; month: number }) => c.year * 12 + c.month;
export const daysIn = (c: { year: number; month: number }) => new Date(c.year, c.month + 1, 0).getDate();
export const sameClient = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const countPosts = (c: CcCalendar) => Object.values(c.days).reduce((n, d) => n + d.posts.length, 0);
export const isEmptyDay = (d: CcDay) => d.posts.length === 0 && !d.marker;

export function nextMonthOf(c: { year: number; month: number }) {
  return c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year };
}

/** The most recent month a client already has, so "add another month" can suggest the one after it. */
export function latestFor(calendars: CcCalendar[], client: string): CcCalendar | null {
  let latest: CcCalendar | null = null;
  for (const c of calendars) if (sameClient(c.client, client) && (!latest || monthKey(c) > monthKey(latest))) latest = c;
  return latest;
}

export interface ClientGroup {
  name: string;
  items: CcCalendar[];
}

/** Calendars grouped by client (case-insensitive), months in order, clients A-Z. */
export function groupByClient(calendars: CcCalendar[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  for (const c of calendars) {
    const k = c.client.trim().toLowerCase();
    if (!map.has(k)) map.set(k, { name: c.client, items: [] });
    map.get(k)!.items.push(c);
  }
  return [...map.values()]
    .map((g) => ({ ...g, items: g.items.slice().sort((a, b) => monthKey(a) - monthKey(b)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Opens on this month if any client has it, otherwise the newest calendar. */
export function pickInitial(calendars: CcCalendar[]): string | null {
  if (calendars.length === 0) return null;
  const now = new Date();
  const current = calendars.find((c) => c.year === now.getFullYear() && c.month === now.getMonth());
  if (current) return current.id;
  return calendars.reduce((best, c) => (monthKey(c) > monthKey(best) ? c : best)).id;
}
