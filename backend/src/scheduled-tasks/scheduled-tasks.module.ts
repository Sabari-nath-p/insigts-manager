import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeavesModule } from '../leaves/leaves.module';
import { AutoLeaveJob } from './auto-leave.job';
import { ScheduledTasksController } from './scheduled-tasks.controller';

@Module({
  imports: [UsersModule, AttendanceModule, LeavesModule],
  controllers: [ScheduledTasksController],
  providers: [AutoLeaveJob],
})
export class ScheduledTasksModule {}
