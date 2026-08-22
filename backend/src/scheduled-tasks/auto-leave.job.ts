import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AttendanceSettingsService } from '../attendance/attendance-settings.service';
import { holidayAppliesToUser, isSecondSaturday, zonedDateString } from '../attendance/attendance-calculations';
import { LeavesService } from '../leaves/leaves.service';
import { WorkingType } from '@prisma/client';
import { WeekDay } from '../common/week-day';

const WEEKDAY_CODES: WeekDay[] = [
  WeekDay.SUN,
  WeekDay.MON,
  WeekDay.TUE,
  WeekDay.WED,
  WeekDay.THU,
  WeekDay.FRI,
  WeekDay.SAT,
];

@Injectable()
export class AutoLeaveJob {
  private readonly logger = new Logger(AutoLeaveJob.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService,
    private readonly attendanceSettingsService: AttendanceSettingsService,
    private readonly leavesService: LeavesService,
  ) {}

  // 03:00 UTC daily — a buffer past midnight so overnight shifts finish before evaluation.
  @Cron('0 3 * * *')
  async handleNightlyAutoLeave(): Promise<void> {
    await this.runForDate(this.yesterdayDateString());
  }

  async runForDate(targetDate: string): Promise<{ processed: number; marked: number }> {
    const users = await this.usersService.findAll();
    const fixedActive = users.filter((u) => u.isActive && u.workingType === WorkingType.fixed);
    const weekDay = WEEKDAY_CODES[new Date(targetDate).getUTCDay()];

    const [settings, holidaysToday] = await Promise.all([
      this.attendanceSettingsService.get(),
      this.attendanceSettingsService.listHolidays(targetDate, targetDate),
    ]);
    const activeHolidaysToday = holidaysToday.filter((h) => h.isActive);
    const secondSaturdayOff = settings.secondSaturdayOff && isSecondSaturday(targetDate);

    let marked = 0;
    for (const user of fixedActive) {
      if (!(user.workingDays as string[] | null)?.includes(weekDay)) continue;
      if (secondSaturdayOff) continue;
      if (activeHolidaysToday.some((h) => holidayAppliesToUser(h, user.department))) continue;

      const complete = await this.attendanceService.hasCompleteAttendance(user.id, targetDate);
      if (complete) continue;

      const alreadyCovered = await this.leavesService.hasLeaveCoveringDate(user.id, targetDate);
      if (alreadyCovered) continue;

      await this.leavesService.createSystemLeave(
        user.id,
        targetDate,
        `Auto-marked unpaid leave: incomplete attendance (missing check-in and/or check-out) on ${targetDate}.`,
      );
      marked += 1;
    }

    this.logger.log(
      `Auto-leave job for ${targetDate}: ${fixedActive.length} fixed employees checked, ${marked} marked.`,
    );
    return { processed: fixedActive.length, marked };
  }

  /**
   * "Yesterday" in APP_TIMEZONE, not the server process's own timezone or raw UTC — consistent
   * with how the rest of the attendance module resolves "today"/"yesterday" (zonedDateString).
   * Computed by taking today's zoned calendar date and stepping back one day in UTC date-math,
   * which is safe here because we're only manipulating a civil date, not converting an instant.
   */
  yesterdayDateString(): string {
    const [year, month, day] = zonedDateString().split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day - 1));
    return d.toISOString().slice(0, 10);
  }
}
