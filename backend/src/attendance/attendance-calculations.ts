import { User, WorkingType } from '@prisma/client';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceSettings } from '@prisma/client';
import { Holiday } from '@prisma/client';

export interface ScheduleWindow {
  startTime: string | null; // "HH:mm", null for flexible workers (no fixed window)
  endTime: string | null;
  requiredMinutes: number;
}

/**
 * The single timezone the whole company operates in (no per-employee/per-tenant timezone
 * exists in this app's data model). Every "HH:mm" schedule time and every "today" calendar
 * date is interpreted in this zone. Override via APP_TIMEZONE for a different deployment.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** UTC offset (in minutes) that `timeZone` is at for the given instant — handles DST correctly. */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asIfUtc - instant.getTime()) / 60000;
}

/** Today's calendar date ("YYYY-MM-DD") in APP_TIMEZONE — not the server process's local date or UTC. */
export function zonedDateString(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function daysInMonthOf(dateStr: string): number {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Resolves the working-hours window that applies to a user on a given date.
 * An employee's own fixed schedule always takes priority; the company-wide
 * AttendanceSettings row is only a fallback for fixed employees missing a field,
 * and for flexible employees who have no fixed clock-in/out window at all.
 */
export function resolveSchedule(
  user: Pick<User, 'workingType' | 'fixedStartTime' | 'fixedEndTime' | 'fixedHoursPerDay' | 'flexibleMonthlyHours'>,
  settings: AttendanceSettings,
  date: string,
): ScheduleWindow {
  if (user.workingType === WorkingType.fixed) {
    return {
      startTime: user.fixedStartTime ?? settings.workStartTime,
      endTime: user.fixedEndTime ?? settings.workEndTime,
      requiredMinutes:
        user.fixedHoursPerDay != null
          ? Math.round(user.fixedHoursPerDay * 60)
          : settings.requiredMinutesPerDay,
    };
  }

  // Flexible workers have no fixed clock-in/out window, so late/early-checkout tracking
  // does not apply to them — only a prorated daily target for overtime purposes.
  const monthlyHours = user.flexibleMonthlyHours ?? settings.requiredMinutesPerDay / 60;
  const requiredMinutes = Math.round((monthlyHours * 60) / daysInMonthOf(date));
  return { startTime: null, endTime: null, requiredMinutes };
}

/**
 * Builds the real UTC instant for a "HH:mm" wall-clock schedule time on a given calendar date,
 * interpreted in APP_TIMEZONE — e.g. combineDateAndTime('2026-08-15', '09:00') is 09:00 IST, not
 * 09:00 UTC. Comparing this against a real check-in instant (also UTC) then yields a correct diff,
 * regardless of what timezone the Node process itself happens to be running in.
 */
export function combineDateAndTime(date: string, hhmm: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  // First guess: treat the wall-clock time as if it were already UTC.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  // Then correct by however far APP_TIMEZONE actually sits from UTC at that moment.
  const offsetMinutes = tzOffsetMinutes(guess, APP_TIMEZONE);
  return new Date(guess.getTime() - offsetMinutes * 60000);
}

/**
 * Parses a `datetime-local` input value ("YYYY-MM-DDTHH:mm", no timezone offset) as wall-clock
 * time in APP_TIMEZONE. The naive `new Date(str)` parse instead treats a timezone-less string
 * as the server process's own local timezone (UTC in Docker) — silently shifting admin-entered
 * times by the IST/UTC offset (and sometimes onto the wrong calendar day) on save. Use this for
 * every `datetime-local` value received from a form, the same way combineDateAndTime is used
 * for "HH:mm" schedule strings.
 */
export function parseZonedDateTime(dateTimeLocal: string): Date {
  const [date, time] = dateTimeLocal.split('T');
  return combineDateAndTime(date, time);
}

export function computeLateMinutes(
  scheduledStart: Date | null,
  actualCheckIn: Date,
  graceMinutes: number,
): number {
  if (!scheduledStart) return 0;
  const diffMinutes = Math.round((actualCheckIn.getTime() - scheduledStart.getTime()) / 60000);
  return Math.max(diffMinutes - graceMinutes, 0);
}

export function computeEarlyCheckoutMinutes(
  scheduledEnd: Date | null,
  actualCheckOut: Date,
  graceMinutes: number,
): number {
  if (!scheduledEnd) return 0;
  const diffMinutes = Math.round((scheduledEnd.getTime() - actualCheckOut.getTime()) / 60000);
  return Math.max(diffMinutes - graceMinutes, 0);
}

/** Clock Out - Clock In - Break Duration. Never negative. */
export function computeWorkedMinutes(checkInAt: Date, checkOutAt: Date, breakMinutes: number): number {
  const rawMinutes = Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000);
  return Math.max(rawMinutes - breakMinutes, 0);
}

/**
 * Actual Worked Hours - (Required Daily Working Hours + overtime threshold). Never negative.
 * The threshold is a buffer of minutes worked past the requirement before it counts as overtime.
 */
export function computeOvertimeMinutes(
  workedMinutes: number,
  requiredMinutes: number,
  overtimeThresholdMinutes = 0,
): number {
  return Math.max(workedMinutes - requiredMinutes - overtimeThresholdMinutes, 0);
}

export function deriveCompletedStatus(
  workedMinutes: number,
  requiredMinutes: number,
  lateMinutes: number,
  earlyCheckoutMinutes: number,
  halfDayThresholdMinutes: number,
): AttendanceStatus {
  if (workedMinutes < halfDayThresholdMinutes) {
    return AttendanceStatus.half_day;
  }
  if (lateMinutes > 0 && earlyCheckoutMinutes > 0) return AttendanceStatus.late_and_early_checkout;
  if (lateMinutes > 0) return AttendanceStatus.late;
  if (earlyCheckoutMinutes > 0) return AttendanceStatus.early_checkout;
  return AttendanceStatus.present;
}

/** True for a Saturday that is the "second Saturday" of its month (day-of-month 8–14). */
export function isSecondSaturday(date: string): boolean {
  const d = new Date(`${date}T00:00:00`);
  return d.getDay() === 6 && d.getDate() >= 8 && d.getDate() <= 14;
}

/** True if a holiday applies to a given department — unset/empty department list means "all". */
export function holidayAppliesToUser(
  holiday: Pick<Holiday, 'applicableDepartments'>,
  department: string | null,
): boolean {
  const departments = holiday.applicableDepartments as string[] | null;
  if (!departments || departments.length === 0) return true;
  return department != null && departments.includes(department);
}
