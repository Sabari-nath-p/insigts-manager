import { DOW_LONG, MONTHS } from './logic';
import type { CcCalendar } from './types';

const HEADER = ['Client', 'Month', 'Year', 'Date', 'Weekday', 'Special day', 'Post number', 'Post type', 'Details'];

/** Quotes a cell. A leading = + @ would run as a formula when opened in Excel, so those get a leading apostrophe. */
function cell(value: string | number): string {
  let s = String(value);
  if (/^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * One row per planned post, in date order, with the special day repeated on that day's rows.
 * A day that only has a special day gets one row with the post columns empty. Days with nothing planned are left out.
 */
export function calendarToCsv(cal: CcCalendar): string {
  const rows: Array<Array<string | number>> = [HEADER];
  const month = String(cal.month + 1).padStart(2, '0');

  const days = Object.keys(cal.days)
    .map(Number)
    .sort((a, b) => a - b);
  for (const day of days) {
    const data = cal.days[String(day)];
    const date = `${cal.year}-${month}-${String(day).padStart(2, '0')}`;
    const weekday = DOW_LONG[new Date(cal.year, cal.month, day).getDay()];
    const head = [cal.client, MONTHS[cal.month], cal.year, date, weekday, data.marker?.label ?? ''];
    if (data.posts.length === 0) rows.push([...head, '', '', '']);
    data.posts.forEach((p, i) => rows.push([...head, i + 1, p.type, p.note]));
  }

  // A byte-order mark makes Excel read the file as UTF-8, so names and notes in any language show correctly.
  return `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

export function csvFileName(cal: CcCalendar): string {
  const slug = cal.client.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
  return `content-calendar-${slug}-${cal.year}-${String(cal.month + 1).padStart(2, '0')}.csv`;
}

export function downloadCalendarCsv(cal: CcCalendar) {
  const url = URL.createObjectURL(new Blob([calendarToCsv(cal)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = csvFileName(cal);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
