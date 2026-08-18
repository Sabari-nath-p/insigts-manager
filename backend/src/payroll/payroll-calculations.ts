import { LeaveType } from '@prisma/client';
import { PayrollAdjustmentType } from '@prisma/client';

/** Payable fraction used only until a `LeavePayrollRule` row exists for that leave type. */
export const DEFAULT_LEAVE_PAYABLE_FRACTION: Record<LeaveType, number> = {
  [LeaveType.paid]: 1,
  [LeaveType.medical]: 1,
  [LeaveType.unpaid]: 0,
};

const DEDUCTING_TYPES = new Set<PayrollAdjustmentType>([
  PayrollAdjustmentType.deduction,
  PayrollAdjustmentType.advance_recovery,
]);

/** True for adjustment types that subtract from payroll rather than add to it. */
export function isDeductingAdjustment(type: PayrollAdjustmentType): boolean {
  return DEDUCTING_TYPES.has(type);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Internal hourly rate = monthly salary / total scheduled hours for the period. Never surfaced to employees. */
export function computeInternalHourlyRate(monthlySalary: number, scheduledMinutes: number): number {
  if (scheduledMinutes <= 0) return 0;
  return monthlySalary / (scheduledMinutes / 60);
}

export function computeBaseSalaryEarned(payableMinutes: number, internalHourlyRate: number): number {
  return round2((payableMinutes / 60) * internalHourlyRate);
}

export interface MonthCalendarDay {
  date: string;
  isHoliday: boolean;
  isWeeklyOff: boolean; // not a working day per schedule/company settings, and not a holiday
  isScheduledWorkingDay: boolean; // counts toward "working days" / the scheduled-hours denominator
}

function daysInMonth(month: string): number {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year, mon, 0).getDate();
}

export function datesInMonth(month: string): string[] {
  const total = daysInMonth(month);
  const dates: string[] = [];
  for (let d = 1; d <= total; d++) {
    dates.push(`${month}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

/**
 * Classifies every calendar day of a month for one employee as holiday / weekly-off / a real
 * scheduled working day — never hardcoded, driven entirely by the supplied predicates (which
 * wrap the employee's own attendance schedule + the live company holiday calendar).
 */
export function buildMonthCalendar(
  month: string,
  isWorkingDay: (date: string) => boolean,
  isHoliday: (date: string) => boolean,
): MonthCalendarDay[] {
  return datesInMonth(month).map((date) => {
    const holiday = isHoliday(date);
    const scheduledWorkingDay = !holiday && isWorkingDay(date);
    return {
      date,
      isHoliday: holiday,
      isWeeklyOff: !holiday && !scheduledWorkingDay,
      isScheduledWorkingDay: scheduledWorkingDay,
    };
  });
}
