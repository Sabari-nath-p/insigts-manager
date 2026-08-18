import { Holiday } from '@prisma/client';

const CSV_HEADERS = [
  'date',
  'name',
  'type',
  'description',
  'isPaid',
  'isOptional',
  'isTentative',
  'applicableDepartments',
  'isActive',
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function holidaysToCsv(holidays: Holiday[]): string {
  const rows = holidays.map((h) =>
    [
      h.date,
      h.name,
      h.type,
      h.description ?? '',
      String(h.isPaid),
      String(h.isOptional),
      String(h.isTentative),
      ((h.applicableDepartments as string[] | null) ?? []).join(';'),
      String(h.isActive),
    ]
      .map(escapeCsvField)
      .join(','),
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

/** Parses CSV text into raw rows, handling quoted fields (incl. embedded commas/newlines). */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface ParsedHolidayRow {
  date: string;
  name: string;
  type: string;
  description: string;
  isPaid: boolean;
  isOptional: boolean;
  isTentative: boolean;
  applicableDepartments: string[];
  isActive: boolean;
}

export function parseHolidaysCsv(text: string): ParsedHolidayRow[] {
  const rows = parseCsvRows(text.trim()).filter((r) => r.some((cell) => cell.trim() !== ''));
  if (rows.length === 0) return [];
  const isHeaderRow = rows[0][0]?.trim().toLowerCase() === 'date';
  const records = isHeaderRow ? rows.slice(1) : rows;
  return records.map((r) => ({
    date: (r[0] ?? '').trim(),
    name: (r[1] ?? '').trim(),
    type: (r[2] ?? '').trim(),
    description: (r[3] ?? '').trim(),
    isPaid: (r[4] ?? 'true').trim().toLowerCase() !== 'false',
    isOptional: (r[5] ?? 'false').trim().toLowerCase() === 'true',
    isTentative: (r[6] ?? 'false').trim().toLowerCase() === 'true',
    applicableDepartments: (r[7] ?? '')
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean),
    isActive: (r[8] ?? 'true').trim().toLowerCase() !== 'false',
  }));
}
