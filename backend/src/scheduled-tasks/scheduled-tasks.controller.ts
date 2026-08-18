import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AutoLeaveJob } from './auto-leave.job';

@ApiTags('scheduled-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.super_admin)
@Controller('admin/scheduled-tasks')
export class ScheduledTasksController {
  constructor(private readonly autoLeaveJob: AutoLeaveJob) {}

  @Post('run')
  run(@Query('date') date?: string) {
    return this.autoLeaveJob.runForDate(date ?? this.autoLeaveJob.yesterdayDateString());
  }
}
