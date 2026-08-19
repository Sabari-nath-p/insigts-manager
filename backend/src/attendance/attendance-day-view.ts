import { AttendanceRecord, AttendanceStatus } from '@prisma/client';
import { HolidayType } from '@prisma/client';
import { computeWorkedMinutes } from './attendance-calculations';

/** Statuses that represent a completed (or in-progress) attendance session. */
export const ATTENDED_STATUSES = new Set<AttendanceStatus>([
  AttendanceStatus.present,
  AttendanceStatus.late,
  AttendanceStatus.early_checkout,
  AttendanceStatus.late_and_early_checkout,
  AttendanceStatus.half_day,
  AttendanceStatus.currently_working,
  AttendanceStatus.not_checked_out,
  AttendanceStatus.holiday_worked,
  AttendanceStatus.week_off_worked,
]);

/** A single day's attendance, whether backed by a real record or derived (no DB row). */
export interface AttendanceDayView {
  recordId: string | null;
  userId: string;
  date: string;
  scheduledStartTime: string | null;
  checkInAt: Date | null;
  lateMinutes: number;
  scheduledEndTime: string | null;
  checkOutAt: Date | null;
  earlyCheckoutMinutes: number;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  holidayName?: string;
  holidayType?: HolidayType;
}

function emptyDay(userId: string, date: string, status: AttendanceStatus, holidayName?: string, holidayType?: HolidayType): AttendanceDayView {
  return {
    recordId: null,
    userId,
    date,
    scheduledStartTime: null,
    checkInAt: null,
    lateMinutes: 0,
    scheduledEndTime: null,
    checkOutAt: null,
    earlyCheckoutMinutes: 0,
    breakMinutes: 0,
    workedMinutes: 0,
    overtimeMinutes: 0,
    status,
    holidayName,
    holidayType,
  };
}

/**
 * Builds the attendance view for one user on one date. Returns null when there is nothing
 * truthful to show yet (today with no check-in, or a future date) — per the requirement to
 * never fabricate attendance data, days without a signal are simply omitted rather than
 * guessed at.
 */
export function buildAttendanceDayView(params: {
  userId: string;
  date: string;
  today: string;
  record: AttendanceRecord | null;
  isHoliday: boolean;
  holidayName?: string;
  holidayType?: HolidayType;
  isOnLeave: boolean;
  isWorkingDay: boolean; // false for a fixed employee's non-working weekday
}): AttendanceDayView | null {
  const { userId, date, today, record, isHoliday, holidayName, holidayType, isOnLeave, isWorkingDay } = params;

  if (record) {
    const isPastIncomplete = date < today && !!record.checkInAt && !record.checkOutAt;
    let status = isPastIncomplete ? AttendanceStatus.not_checked_out : record.status;
    // An employee who clocked in on a holiday or weekly-off is recorded separately so it's
    // never confused with a normal working day, but still counts as attended for stats.
    if (ATTENDED_STATUSES.has(status)) {
      if (isHoliday) status = AttendanceStatus.holiday_worked;
      else if (!isWorkingDay) status = AttendanceStatus.week_off_worked;
    }
    // While still checked in, workedMinutes is null (only finalized at checkout) — compute
    // worked-so-far against the current instant instead of showing a stale 0 to admins.
    const workedMinutes =
      record.workedMinutes ??
      (record.checkInAt ? computeWorkedMinutes(record.checkInAt, new Date(), record.totalBreakMinutes) : 0);
    return {
      recordId: record.id,
      userId,
      date,
      scheduledStartTime: record.scheduledStartTime,
      checkInAt: record.checkInAt,
      lateMinutes: record.lateMinutes,
      scheduledEndTime: record.scheduledEndTime,
      checkOutAt: record.checkOutAt,
      earlyCheckoutMinutes: record.earlyCheckoutMinutes,
      breakMinutes: record.totalBreakMinutes,
      workedMinutes,
      overtimeMinutes: record.overtimeMinutes,
      status,
      holidayName: isHoliday ? holidayName : undefined,
      holidayType: isHoliday ? holidayType : undefined,
    };
  }

  if (isHoliday) return emptyDay(userId, date, AttendanceStatus.holiday, holidayName, holidayType);
  if (!isWorkingDay) return emptyDay(userId, date, AttendanceStatus.weekend);
  if (isOnLeave) return emptyDay(userId, date, AttendanceStatus.on_leave);
  if (date < today) return emptyDay(userId, date, AttendanceStatus.absent);
  return null;
}
