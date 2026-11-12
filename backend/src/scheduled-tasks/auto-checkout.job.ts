import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AUTO_CHECKOUT_TIME } from '../attendance/attendance-calculations';
import { AttendanceService } from '../attendance/attendance.service';
import { scheduleDaily } from '../notifications/daily-schedule';

/**
 * Every day at 21:00 (company timezone): anyone still clocked in forgot to check out, so they are closed
 * at their end of day and marked "not checked out". A forgotten check-out never runs on. Failures are
 * logged and never thrown, so this can not take the server down.
 */
@Injectable()
export class AutoCheckoutJob implements OnModuleInit {
  private readonly logger = new Logger(AutoCheckoutJob.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly attendance: AttendanceService,
  ) {}

  onModuleInit() {
    const [hour, minute] = AUTO_CHECKOUT_TIME.split(':').map(Number);
    scheduleDaily(this.registry, 'attendance-auto-checkout', hour, minute, () => this.run());
  }

  async run(): Promise<{ closed: number; skipped: number }> {
    const result = await this.attendance.autoCloseOpenRecords();
    this.logger.log(`Auto check-out at ${AUTO_CHECKOUT_TIME}: ${result.closed} checked out, ${result.skipped} skipped.`);
    return result;
  }
}
