import { Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { APP_TIMEZONE } from '../attendance/attendance-calculations';

/**
 * Runs `fn` every day at hh:mm in the company timezone (APP_TIMEZONE, the same zone attendance
 * uses). Registered at startup rather than with a decorator so the timezone is read after the
 * environment has been loaded.
 */
export function scheduleDaily(registry: SchedulerRegistry, name: string, hour: number, minute: number, fn: () => Promise<unknown>) {
  const logger = new Logger('DailySchedule');
  const job = new CronJob(
    `0 ${minute} ${hour} * * *`,
    () => {
      fn().catch((e) => logger.error(`${name} failed: ${(e as Error).message}`));
    },
    null,
    true,
    APP_TIMEZONE,
  );
  registry.addCronJob(name, job);
  logger.log(`${name} scheduled daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${APP_TIMEZONE}`);
}
