import { Module } from '@nestjs/common';
import { WorkLogsService } from './work-logs.service';
import { WorkLogsController } from './work-logs.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeavesModule } from '../leaves/leaves.module';

@Module({
  imports: [AttendanceModule, LeavesModule],
  controllers: [WorkLogsController],
  providers: [WorkLogsService],
  exports: [WorkLogsService],
})
export class WorkLogsModule {}
