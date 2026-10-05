import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TasksService } from './tasks.service';

/** Daily 07:00 UTC: tells assignees about open tasks due tomorrow. */
@Injectable()
export class PmDueSoonJob {
  private readonly logger = new Logger(PmDueSoonJob.name);

  constructor(private readonly tasks: TasksService) {}

  @Cron('0 7 * * *', { timeZone: 'UTC' })
  async run() {
    const sent = await this.tasks.notifyDueSoon();
    this.logger.log(`Due-soon notifications sent: ${sent}`);
  }
}
