import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { TasksService } from './tasks.service';
import { InsightsService } from './insights.service';
import { PmAccessService } from './pm-access.service';
import { PmAccessGuard } from './pm-access.guard';
import { PmActivityService } from './pm-activity.service';
import { PmDueSoonJob } from './pm-due-soon.job';

/** Project management. Self-contained apart from the mail module, which sends the "you were assigned" emails. */
@Module({
  imports: [MailModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, TasksService, InsightsService, PmAccessService, PmAccessGuard, PmActivityService, PmDueSoonJob],
})
export class ProjectsModule {}
