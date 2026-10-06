import { Controller, ForbiddenException, Injectable, Logger, OnModuleInit, Post, UseGuards } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, WorkingType } from '@prisma/client';
import { AttendanceService } from '../attendance/attendance.service';
import { AttendanceSettingsService } from '../attendance/attendance-settings.service';
import { holidayAppliesToUser, isSecondSaturday, zonedDateString } from '../attendance/attendance-calculations';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeekDay } from '../common/week-day';
import { LeavesService } from '../leaves/leaves.service';
import { UsersService } from '../users/users.service';
import { scheduleDaily } from './daily-schedule';
import { NotificationsService } from './notifications.service';

const WEEKDAY_CODES: WeekDay[] = [WeekDay.SUN, WeekDay.MON, WeekDay.TUE, WeekDay.WED, WeekDay.THU, WeekDay.FRI, WeekDay.SAT];
const FLEXIBLE_DAYS: WeekDay[] = [WeekDay.MON, WeekDay.TUE, WeekDay.WED, WeekDay.THU, WeekDay.FRI];

/**
 * 10:00 every day: tells everyone who is expected to work today and has not started yet to
 * check in. Follows the same rules as the nightly auto-leave job for who is "expected":
 * working days, second-Saturday setting, holidays for their department, and approved leave.
 */
@Injectable()
export class LoginReminderJob implements OnModuleInit {
  private readonly logger = new Logger(LoginReminderJob.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly users: UsersService,
    private readonly attendance: AttendanceService,
    private readonly settings: AttendanceSettingsService,
    private readonly leaves: LeavesService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    scheduleDaily(this.registry, 'login-reminder', 10, 0, () => this.run());
    scheduleDaily(this.registry, 'notifications-prune', 3, 30, () => this.notifications.prune());
  }

  async run(): Promise<{ date: string; reminded: number }> {
    const today = zonedDateString();
    const weekDay = WEEKDAY_CODES[new Date(today).getUTCDay()];
    const [all, settings, holidays] = await Promise.all([
      this.users.findAll(),
      this.settings.get(),
      this.settings.listHolidays(today, today),
    ]);
    const activeHolidays = holidays.filter((h) => h.isActive);
    if (settings.secondSaturdayOff && isSecondSaturday(today)) return { date: today, reminded: 0 };

    const due: string[] = [];
    for (const user of all.filter((u) => u.isActive)) {
      const days = user.workingType === WorkingType.fixed ? ((user.workingDays as WeekDay[] | null) ?? []) : FLEXIBLE_DAYS;
      if (!days.includes(weekDay)) continue;
      if (activeHolidays.some((h) => holidayAppliesToUser(h, user.department))) continue;
      const record = await this.attendance.getToday(user.id);
      if (record?.checkInAt) continue;
      if (await this.leaves.hasLeaveCoveringDate(user.id, today)) continue;
      due.push(user.id);
    }

    await this.notifications.notifyUsers(due, {
      type: 'reminder.login',
      title: 'Time to start your day',
      body: 'It is 10:00 and you have not checked in yet.',
      link: '/attendance',
    });
    this.logger.log(`Login reminder sent to ${due.length} of ${all.length} users`);
    return { date: today, reminded: due.length };
  }
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications/cron')
export class LoginReminderController {
  constructor(private readonly job: LoginReminderJob) {}

  /** Lets a super admin run today's reminder by hand, e.g. to check it before relying on it. */
  @Post('login-reminder')
  run(@CurrentUser() user: { role: UserRole }) {
    if (user.role !== UserRole.super_admin) throw new ForbiddenException('Admins only');
    return this.job.run();
  }
}
