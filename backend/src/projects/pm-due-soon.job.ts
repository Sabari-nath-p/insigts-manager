import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { scheduleDaily } from '../notifications/daily-schedule';
import { TasksService } from './tasks.service';

/** Daily at 10:00 company time: tells assignees about open tasks due today or tomorrow. */
@Injectable()
export class PmDueSoonJob implements OnModuleInit {
  private readonly logger = new Logger(PmDueSoonJob.name);

  constructor(
    private readonly tasks: TasksService,
    private readonly registry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    scheduleDaily(this.registry, 'pm-due-soon', 10, 0, () => this.run());
  }

  async run() {
    const sent = await this.tasks.notifyDueSoon();
    this.logger.log(`Due-date notifications sent: ${sent}`);
    return sent;
  }
}
