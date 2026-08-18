import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRecord, AttendanceStatus, PresenceStatus, User, WorkingType } from '@prisma/client';
import { WeekDay } from '../common/week-day';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceSettings } from '@prisma/client';
import { Holiday } from '@prisma/client';
import { AttendanceSettingsService } from './attendance-settings.service';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto';
import { ATTENDED_STATUSES, AttendanceDayView, buildAttendanceDayView } from './attendance-day-view';
import {
  combineDateAndTime,
  computeEarlyCheckoutMinutes,
  computeLateMinutes,
  computeOvertimeMinutes,
  computeWorkedMinutes,
  deriveCompletedStatus,
  holidayAppliesToUser,
  isSecondSaturday,
  resolveSchedule,
  zonedDateString,
} from './attendance-calculations';
import { LeavesService } from '../leaves/leaves.service';

/** "Today" in the company's operating timezone (APP_TIMEZONE) — not the server process's local date or UTC. */
function todayDateString(): string {
  return zonedDateString();
}

function dateRangeInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function firstAndLastDayOfMonth(month: string): { from: string; to: string } {
  const [year, mon] = month.split('-').map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

const WEEKDAY_CODES: WeekDay[] = [
  WeekDay.SUN,
  WeekDay.MON,
  WeekDay.TUE,
  WeekDay.WED,
  WeekDay.THU,
  WeekDay.FRI,
  WeekDay.SAT,
];

export function isWorkingDayFor(user: User, date: string, settings: AttendanceSettings): boolean {
  // A company-wide second-Saturday-off overrides any per-user schedule, same as a holiday would.
  if (settings.secondSaturdayOff && isSecondSaturday(date)) return false;
  if (user.workingType !== WorkingType.fixed) return true; // flexible workers have no fixed weekend
  const weekday = WEEKDAY_CODES[new Date(`${date}T00:00:00`).getDay()];
  const workingDays = (user.workingDays as WeekDay[] | null) ?? [];
  return workingDays.includes(weekday);
}

/** True for statuses that don't count toward the expected "working days" denominator. */
function isNonWorkingStatus(status: AttendanceStatus): boolean {
  return (
    status === AttendanceStatus.weekend ||
    status === AttendanceStatus.holiday ||
    status === AttendanceStatus.holiday_worked ||
    status === AttendanceStatus.week_off_worked
  );
}

const MAX_MATRIX_CELLS = 4000; // users x days safety cap for admin table/analytics queries

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: AttendanceSettingsService,
    private readonly leavesService: LeavesService,
  ) {}

  private async syncPresence(userId: string, status: PresenceStatus): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { currentStatus: status } });
  }

  private async getUserOrFail(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ==========================================================================
  // Employee-facing: clock in / out / break
  // ==========================================================================

  async checkIn(userId: string): Promise<AttendanceRecord> {
    const user = await this.getUserOrFail(userId);
    if (!user.isActive) {
      throw new ForbiddenException('Deactivated accounts cannot clock in');
    }

    const date = todayDateString();
    const existing = await this.prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date } } });

    if (existing?.checkInAt && !existing.checkOutAt) {
      throw new ConflictException('Already checked in today');
    }
    if (existing?.checkOutAt) {
      throw new ConflictException('Attendance for today is already complete');
    }

    const settings = await this.settingsService.get();
    const schedule = resolveSchedule(user, settings, date);
    const checkInAt = new Date();
    const lateMinutes = computeLateMinutes(
      schedule.startTime ? combineDateAndTime(date, schedule.startTime) : null,
      checkInAt,
      settings.lateGraceMinutes,
    );

    const data = {
      checkInAt,
      checkOutAt: null,
      workedMinutes: null,
      breakStartAt: null,
      totalBreakMinutes: 0,
      scheduledStartTime: schedule.startTime,
      scheduledEndTime: schedule.endTime,
      requiredMinutes: schedule.requiredMinutes,
      lateMinutes,
      earlyCheckoutMinutes: 0,
      overtimeMinutes: 0,
      status: AttendanceStatus.currently_working,
    };

    const saved = existing
      ? await this.prisma.attendanceRecord.update({ where: { id: existing.id }, data })
      : await this.prisma.attendanceRecord.create({ data: { userId, date, ...data } });

    await this.syncPresence(userId, PresenceStatus.working);
    return saved;
  }

  async checkOut(userId: string): Promise<AttendanceRecord> {
    const date = todayDateString();
    const record = await this.prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date } } });

    if (!record || !record.checkInAt) {
      throw new BadRequestException('You must check in before checking out');
    }
    if (record.checkOutAt) {
      throw new ConflictException('Already checked out today');
    }
    if (record.breakStartAt) {
      throw new ConflictException('End your current break before checking out');
    }

    const settings = await this.settingsService.get();
    const checkOutAt = new Date();
    const workedMinutes = computeWorkedMinutes(new Date(record.checkInAt), checkOutAt, record.totalBreakMinutes);
    const earlyCheckoutMinutes = computeEarlyCheckoutMinutes(
      record.scheduledEndTime ? combineDateAndTime(date, record.scheduledEndTime) : null,
      checkOutAt,
      settings.earlyCheckoutGraceMinutes,
    );
    const overtimeMinutes = computeOvertimeMinutes(
      workedMinutes,
      record.requiredMinutes ?? settings.requiredMinutesPerDay,
      settings.overtimeThresholdMinutes,
    );
    const status = deriveCompletedStatus(
      workedMinutes,
      record.requiredMinutes ?? settings.requiredMinutesPerDay,
      record.lateMinutes,
      earlyCheckoutMinutes,
      settings.halfDayThresholdMinutes,
    );

    const saved = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOutAt, workedMinutes, earlyCheckoutMinutes, overtimeMinutes, status },
    });
    await this.syncPresence(userId, PresenceStatus.offline);
    return saved;
  }

  async breakStart(userId: string): Promise<AttendanceRecord> {
    const date = todayDateString();
    const record = await this.prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date } } });

    if (!record || !record.checkInAt) {
      throw new BadRequestException('You must check in before starting a break');
    }
    if (record.checkOutAt) {
      throw new ConflictException('Attendance for today is already complete');
    }
    if (record.breakStartAt) {
      throw new ConflictException('Already on a break');
    }

    const startAt = new Date();
    const saved = await this.prisma.attendanceRecord.update({ where: { id: record.id }, data: { breakStartAt: startAt } });
    await this.prisma.attendanceBreak.create({ data: { attendanceRecordId: record.id, startAt } });
    await this.syncPresence(userId, PresenceStatus.on_break);
    return saved;
  }

  async breakEnd(userId: string): Promise<AttendanceRecord> {
    const date = todayDateString();
    const record = await this.prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date } } });

    if (!record || !record.breakStartAt) {
      throw new BadRequestException('You are not currently on a break');
    }

    const endAt = new Date();
    const elapsedMinutes = Math.max(Math.round((endAt.getTime() - new Date(record.breakStartAt).getTime()) / 60000), 0);
    const saved = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { totalBreakMinutes: record.totalBreakMinutes + elapsedMinutes, breakStartAt: null },
    });

    const openBreak = await this.prisma.attendanceBreak.findFirst({
      where: { attendanceRecordId: record.id, endAt: null },
      orderBy: { startAt: 'desc' },
    });
    if (openBreak) {
      await this.prisma.attendanceBreak.update({
        where: { id: openBreak.id },
        data: { endAt, durationMinutes: elapsedMinutes },
      });
    }

    await this.syncPresence(userId, PresenceStatus.working);
    return saved;
  }

  getToday(userId: string): Promise<AttendanceRecord | null> {
    return this.prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date: todayDateString() } } });
  }

  // ==========================================================================
  // Employee-facing: history
  // ==========================================================================

  async listForUser(
    userId: string,
    opts: { from?: string; to?: string; month?: string; status?: AttendanceStatus } = {},
  ): Promise<AttendanceDayView[]> {
    const user = await this.getUserOrFail(userId);
    const { from, to } = this.resolveRange(opts);
    const dates = dateRangeInclusive(from, to);
    const today = todayDateString();

    const [records, holidays, leaves, settings] = await Promise.all([
      this.prisma.attendanceRecord.findMany({ where: { userId, date: { gte: from, lte: to } } }),
      this.settingsService.listHolidays(from, to),
      this.leavesService.listApprovedForUserInRange(userId, from, to),
      this.settingsService.get(),
    ]);

    const recordByDate = new Map(records.map((r) => [r.date, r]));
    const holidayByDate = new Map(
      holidays.filter((h) => h.isActive && holidayAppliesToUser(h, user.department)).map((h) => [h.date, h]),
    );

    const views = dates
      .map((date) =>
        buildAttendanceDayView({
          userId,
          date,
          today,
          record: recordByDate.get(date) ?? null,
          isHoliday: holidayByDate.has(date),
          holidayName: holidayByDate.get(date)?.name,
          holidayType: holidayByDate.get(date)?.type,
          isOnLeave: leaves.some((l) => l.startDate <= date && l.endDate >= date),
          isWorkingDay: isWorkingDayFor(user, date, settings),
        }),
      )
      .filter((v): v is AttendanceDayView => v !== null);

    const filtered = opts.status ? views.filter((v) => v.status === opts.status) : views;
    return filtered.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  private resolveRange(opts: { from?: string; to?: string; month?: string }): { from: string; to: string } {
    if (opts.month) return firstAndLastDayOfMonth(opts.month);
    if (opts.from && opts.to) return { from: opts.from, to: opts.to };
    const today = todayDateString();
    return firstAndLastDayOfMonth(today.slice(0, 7));
  }

  /** Sum of worked minutes for a user within an inclusive date range. */
  async totalWorkedMinutes(userId: string, from: string, to: string): Promise<number> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { userId, date: { gte: from, lte: to } },
    });
    return records.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
  }

  /** Days within the range that have a completed check-in + check-out. */
  countWorkedDays(userId: string, from: string, to: string): Promise<number> {
    return this.prisma.attendanceRecord.count({
      where: { userId, date: { gte: from, lte: to }, checkOutAt: { not: null } },
    });
  }

  /** True iff the user has a completed (checked-in AND checked-out) record for that date. */
  async hasCompleteAttendance(userId: string, date: string): Promise<boolean> {
    const count = await this.prisma.attendanceRecord.count({
      where: { userId, date, checkInAt: { not: null }, checkOutAt: { not: null } },
    });
    return count > 0;
  }

  // ==========================================================================
  // Super admin: summary, cross-employee table, employee detail, analytics
  // ==========================================================================

  private async activeEmployees(filters: { employeeId?: string; department?: string; role?: string } = {}): Promise<User[]> {
    const where: Record<string, unknown> = { isActive: true };
    if (filters.employeeId) where.id = filters.employeeId;
    if (filters.department) where.department = filters.department;
    if (filters.role) where.role = filters.role;
    return this.prisma.user.findMany({ where, orderBy: { fullName: 'asc' } });
  }

  private async dayViewsForUsers(users: User[], from: string, to: string): Promise<AttendanceDayView[]> {
    const dates = dateRangeInclusive(from, to);
    if (users.length * dates.length > MAX_MATRIX_CELLS) {
      throw new BadRequestException('Date range too wide for the selected employees — narrow the filters');
    }
    const userIds = users.map((u) => u.id);
    const today = todayDateString();

    const [records, holidays, leaves, settings] = await Promise.all([
      userIds.length
        ? this.prisma.attendanceRecord.findMany({ where: { userId: { in: userIds }, date: { gte: from, lte: to } } })
        : Promise.resolve([]),
      this.settingsService.listHolidays(from, to),
      this.leavesService.listApprovedInRange(from, to),
      this.settingsService.get(),
    ]);

    const recordByUserDate = new Map(records.map((r) => [`${r.userId}:${r.date}`, r]));
    const activeHolidays = holidays.filter((h) => h.isActive);
    const holidaysByDate = new Map<string, Holiday[]>();
    for (const holiday of activeHolidays) {
      const bucket = holidaysByDate.get(holiday.date) ?? [];
      bucket.push(holiday);
      holidaysByDate.set(holiday.date, bucket);
    }

    const views: AttendanceDayView[] = [];
    for (const user of users) {
      for (const date of dates) {
        const holiday = holidaysByDate.get(date)?.find((h) => holidayAppliesToUser(h, user.department));
        const view = buildAttendanceDayView({
          userId: user.id,
          date,
          today,
          record: recordByUserDate.get(`${user.id}:${date}`) ?? null,
          isHoliday: !!holiday,
          holidayName: holiday?.name,
          holidayType: holiday?.type,
          isOnLeave: leaves.some((l) => l.userId === user.id && l.startDate <= date && l.endDate >= date),
          isWorkingDay: isWorkingDayFor(user, date, settings),
        });
        if (view) views.push(view);
      }
    }
    return views;
  }

  async adminSummary(date: string = todayDateString()): Promise<{
    totalEmployees: number;
    presentToday: number;
    currentlyWorking: number;
    lateToday: number;
    earlyCheckoutToday: number;
    absentToday: number;
    onLeaveToday: number;
    overtimeToday: { count: number; totalMinutes: number };
  }> {
    const users = await this.activeEmployees();
    const views = await this.dayViewsForUsers(users, date, date);

    return {
      totalEmployees: users.length,
      presentToday: views.filter((v) => ATTENDED_STATUSES.has(v.status)).length,
      currentlyWorking: views.filter((v) => v.status === AttendanceStatus.currently_working).length,
      lateToday: views.filter((v) => v.lateMinutes > 0).length,
      earlyCheckoutToday: views.filter((v) => v.earlyCheckoutMinutes > 0).length,
      absentToday: views.filter((v) => v.status === AttendanceStatus.absent).length,
      onLeaveToday: views.filter((v) => v.status === AttendanceStatus.on_leave).length,
      overtimeToday: {
        count: views.filter((v) => v.overtimeMinutes > 0).length,
        totalMinutes: views.reduce((sum, v) => sum + v.overtimeMinutes, 0),
      },
    };
  }

  async adminListRecords(filters: {
    employeeId?: string;
    department?: string;
    role?: string;
    date?: string;
    from?: string;
    to?: string;
    month?: string;
    status?: AttendanceStatus;
    onlyLate?: boolean;
    onlyEarlyCheckout?: boolean;
    onlyOvertime?: boolean;
    onlyCurrentlyWorking?: boolean;
  }): Promise<Array<AttendanceDayView & { fullName: string; role: string; department: string | null }>> {
    const users = await this.activeEmployees(filters);
    const { from, to } = filters.date
      ? { from: filters.date, to: filters.date }
      : this.resolveRange(filters);

    let views = await this.dayViewsForUsers(users, from, to);

    if (filters.status) views = views.filter((v) => v.status === filters.status);
    if (filters.onlyLate) views = views.filter((v) => v.lateMinutes > 0);
    if (filters.onlyEarlyCheckout) views = views.filter((v) => v.earlyCheckoutMinutes > 0);
    if (filters.onlyOvertime) views = views.filter((v) => v.overtimeMinutes > 0);
    if (filters.onlyCurrentlyWorking) views = views.filter((v) => v.status === AttendanceStatus.currently_working);

    const userById = new Map(users.map((u) => [u.id, u]));
    return views
      .map((v) => {
        const u = userById.get(v.userId)!;
        return { ...v, fullName: u.fullName, role: u.role, department: u.department };
      })
      .sort((a, b) => (a.date === b.date ? a.fullName.localeCompare(b.fullName) : a.date < b.date ? 1 : -1));
  }

  async employeeDetail(
    userId: string,
    month: string = todayDateString().slice(0, 7),
  ): Promise<{
    user: Pick<User, 'id' | 'fullName' | 'email' | 'role' | 'department' | 'designation'>;
    month: string;
    stats: {
      totalCalendarDays: number;
      workingDays: number;
      holidays: number;
      weeklyOffs: number;
      presentDays: number;
      absentDays: number;
      leaveDays: number;
      halfDayDays: number;
      lateDays: number;
      earlyCheckoutDays: number;
      holidayWorkedDays: number;
      weekOffWorkedDays: number;
      totalWorkedMinutes: number;
      averageDailyMinutes: number;
      totalOvertimeMinutes: number;
      totalLateMinutes: number;
      totalEarlyCheckoutMinutes: number;
      attendancePercentage: number;
    };
    history: AttendanceDayView[];
  }> {
    const user = await this.getUserOrFail(userId);
    const { from, to } = firstAndLastDayOfMonth(month);
    const history = await this.dayViewsForUsers([user], from, to);

    const totalCalendarDays = history.length;
    const workingDays = history.filter((v) => !isNonWorkingStatus(v.status)).length;
    const holidays = history.filter((v) => v.status === AttendanceStatus.holiday).length;
    const weeklyOffs = history.filter((v) => v.status === AttendanceStatus.weekend).length;
    const holidayWorkedDays = history.filter((v) => v.status === AttendanceStatus.holiday_worked).length;
    const weekOffWorkedDays = history.filter((v) => v.status === AttendanceStatus.week_off_worked).length;
    const halfDayDays = history.filter((v) => v.status === AttendanceStatus.half_day).length;
    // Present-days used for the attendance percentage only covers expected working days —
    // holiday/week-off-worked days are bonus attendance, tracked separately above.
    const presentDays = history.filter(
      (v) =>
        ATTENDED_STATUSES.has(v.status) &&
        v.status !== AttendanceStatus.holiday_worked &&
        v.status !== AttendanceStatus.week_off_worked,
    ).length;
    const absentDays = history.filter((v) => v.status === AttendanceStatus.absent).length;
    const leaveDays = history.filter((v) => v.status === AttendanceStatus.on_leave).length;
    const lateDays = history.filter((v) => v.lateMinutes > 0).length;
    const earlyCheckoutDays = history.filter((v) => v.earlyCheckoutMinutes > 0).length;
    const totalWorkedMinutes = history.reduce((sum, v) => sum + v.workedMinutes, 0);
    const completedDays = history.filter((v) => v.checkOutAt).length;
    const totalOvertimeMinutes = history.reduce((sum, v) => sum + v.overtimeMinutes, 0);
    const totalLateMinutes = history.reduce((sum, v) => sum + v.lateMinutes, 0);
    const totalEarlyCheckoutMinutes = history.reduce((sum, v) => sum + v.earlyCheckoutMinutes, 0);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
      },
      month,
      stats: {
        totalCalendarDays,
        workingDays,
        holidays,
        weeklyOffs,
        presentDays,
        absentDays,
        leaveDays,
        halfDayDays,
        lateDays,
        earlyCheckoutDays,
        holidayWorkedDays,
        weekOffWorkedDays,
        totalWorkedMinutes,
        averageDailyMinutes: completedDays ? Math.round(totalWorkedMinutes / completedDays) : 0,
        totalOvertimeMinutes,
        totalLateMinutes,
        totalEarlyCheckoutMinutes,
        attendancePercentage: workingDays ? Math.round((presentDays / workingDays) * 1000) / 10 : 0,
      },
      history: history.sort((a, b) => (a.date < b.date ? 1 : -1)),
    };
  }

  async analytics(
    from: string,
    to: string,
  ): Promise<{
    period: { from: string; to: string };
    daily: Array<{
      date: string;
      present: number;
      absent: number;
      late: number;
      earlyCheckout: number;
      overtimeMinutes: number;
    }>;
    employeeAttendance: Array<{ userId: string; fullName: string; percentage: number }>;
  }> {
    const users = await this.activeEmployees();
    const views = await this.dayViewsForUsers(users, from, to);
    const dates = dateRangeInclusive(from, to);

    const daily = dates.map((date) => {
      const dayViews = views.filter((v) => v.date === date);
      return {
        date,
        present: dayViews.filter((v) => ATTENDED_STATUSES.has(v.status)).length,
        absent: dayViews.filter((v) => v.status === AttendanceStatus.absent).length,
        late: dayViews.filter((v) => v.lateMinutes > 0).length,
        earlyCheckout: dayViews.filter((v) => v.earlyCheckoutMinutes > 0).length,
        overtimeMinutes: dayViews.reduce((sum, v) => sum + v.overtimeMinutes, 0),
      };
    });

    const employeeAttendance = users.map((u) => {
      const userViews = views.filter((v) => v.userId === u.id);
      const workingDays = userViews.filter((v) => !isNonWorkingStatus(v.status)).length;
      const presentDays = userViews.filter(
        (v) =>
          ATTENDED_STATUSES.has(v.status) &&
          v.status !== AttendanceStatus.holiday_worked &&
          v.status !== AttendanceStatus.week_off_worked,
      ).length;
      return {
        userId: u.id,
        fullName: u.fullName,
        percentage: workingDays ? Math.round((presentDays / workingDays) * 1000) / 10 : 0,
      };
    });

    return { period: { from, to }, daily, employeeAttendance };
  }

  // ==========================================================================
  // Super admin: correction
  // ==========================================================================

  async correctRecord(adminId: string, recordId: string, dto: CorrectAttendanceDto): Promise<AttendanceRecord> {
    const record = await this.prisma.attendanceRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    const user = await this.getUserOrFail(record.userId);

    const newDate = dto.date ?? record.date;
    if (newDate !== record.date) {
      const clash = await this.prisma.attendanceRecord.findUnique({ where: { userId_date: { userId: record.userId, date: newDate } } });
      if (clash) {
        throw new ConflictException('An attendance record already exists for that user on that date');
      }
    }

    const newCheckInAt = dto.checkInAt !== undefined ? (dto.checkInAt ? new Date(dto.checkInAt) : null) : record.checkInAt;
    const newCheckOutAt = dto.checkOutAt !== undefined ? (dto.checkOutAt ? new Date(dto.checkOutAt) : null) : record.checkOutAt;
    const newBreakMinutes = dto.totalBreakMinutes ?? record.totalBreakMinutes;

    if (newCheckOutAt && !newCheckInAt) {
      throw new BadRequestException('Cannot set a check-out time without a check-in time');
    }
    if (newCheckInAt && newCheckOutAt && newCheckOutAt <= newCheckInAt) {
      throw new BadRequestException('Check-out must be after check-in');
    }
    if (newBreakMinutes < 0) {
      throw new BadRequestException('Break duration cannot be negative');
    }
    if (newCheckInAt && newCheckOutAt) {
      const rawMinutes = Math.round((newCheckOutAt.getTime() - newCheckInAt.getTime()) / 60000);
      if (newBreakMinutes > rawMinutes) {
        throw new BadRequestException('Break duration cannot exceed the session length');
      }
    }

    const settings = await this.settingsService.get();
    const schedule = resolveSchedule(user, settings, newDate);

    const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
    const track = (field: string, oldVal: unknown, newVal: unknown) => {
      const oldStr = oldVal == null ? null : String(oldVal);
      const newStr = newVal == null ? null : String(newVal);
      if (oldStr !== newStr) changes.push({ field, oldValue: oldStr, newValue: newStr });
    };
    track('date', record.date, newDate);
    track('checkInAt', record.checkInAt?.toISOString() ?? null, newCheckInAt?.toISOString() ?? null);
    track('checkOutAt', record.checkOutAt?.toISOString() ?? null, newCheckOutAt?.toISOString() ?? null);
    track('totalBreakMinutes', record.totalBreakMinutes, newBreakMinutes);

    const data: Record<string, unknown> = {
      date: newDate,
      checkInAt: newCheckInAt,
      checkOutAt: newCheckOutAt,
      totalBreakMinutes: newBreakMinutes,
      breakStartAt: null, // a correction always resolves any in-progress break
      scheduledStartTime: schedule.startTime,
      scheduledEndTime: schedule.endTime,
      requiredMinutes: schedule.requiredMinutes,
    };

    if (newCheckInAt) {
      data.lateMinutes = computeLateMinutes(
        schedule.startTime ? combineDateAndTime(newDate, schedule.startTime) : null,
        newCheckInAt,
        settings.lateGraceMinutes,
      );
    } else {
      data.lateMinutes = 0;
    }

    if (newCheckInAt && newCheckOutAt) {
      const workedMinutes = computeWorkedMinutes(newCheckInAt, newCheckOutAt, newBreakMinutes);
      data.workedMinutes = workedMinutes;
      data.earlyCheckoutMinutes = computeEarlyCheckoutMinutes(
        schedule.endTime ? combineDateAndTime(newDate, schedule.endTime) : null,
        newCheckOutAt,
        settings.earlyCheckoutGraceMinutes,
      );
      data.overtimeMinutes = computeOvertimeMinutes(
        workedMinutes,
        (data.requiredMinutes as number | null) ?? settings.requiredMinutesPerDay,
        settings.overtimeThresholdMinutes,
      );
      data.status = deriveCompletedStatus(
        workedMinutes,
        (data.requiredMinutes as number | null) ?? settings.requiredMinutesPerDay,
        data.lateMinutes as number,
        data.earlyCheckoutMinutes as number,
        settings.halfDayThresholdMinutes,
      );
    } else {
      data.workedMinutes = null;
      data.earlyCheckoutMinutes = 0;
      data.overtimeMinutes = 0;
      data.status = AttendanceStatus.currently_working;
    }

    data.lastEditedBy = adminId;
    data.lastEditedAt = new Date();

    const saved = await this.prisma.attendanceRecord.update({ where: { id: record.id }, data });

    if (changes.length) {
      await this.prisma.attendanceAuditLog.createMany({
        data: changes.map((c) => ({
          attendanceRecordId: record.id,
          adminId,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
      });
    }

    return saved;
  }

  auditTrail(recordId: string) {
    return this.prisma.attendanceAuditLog.findMany({ where: { attendanceRecordId: recordId }, orderBy: { changedAt: 'desc' } });
  }
}
