export interface PayrollCsvRow {
  fullName: string;
  payrollMonth: string;
  workingDays: number;
  scheduledHours: number;
  actualHours: number;
  payableHours: number;
  extraHours: number;
  baseSalaryEarned: string;
  finalPayableAmount: string;
  status: string;
  paymentStatus: string;
}

const CSV_HEADERS = [
  'employee',
  'month',
  'workingDays',
  'scheduledHours',
  'actualHours',
  'payableHours',
  'extraHours',
  'baseSalaryEarned',
  'finalPayableAmount',
  'status',
  'paymentStatus',
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function payrollRecordsToCsv(rows: PayrollCsvRow[]): string {
  const body = rows.map((r) =>
    [
      r.fullName,
      r.payrollMonth,
      String(r.workingDays),
      String(r.scheduledHours),
      String(r.actualHours),
      String(r.payableHours),
      String(r.extraHours),
      r.baseSalaryEarned,
      r.finalPayableAmount,
      r.status,
      r.paymentStatus,
    ]
      .map(escapeCsvField)
      .join(','),
  );
  return [CSV_HEADERS.join(','), ...body].join('\n');
}
