import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceSettingsService } from './attendance-settings.service';
import { AttendanceController } from './attendance.controller';
import { LeavesModule } from '../leaves/leaves.module';

@Module({
  imports: [LeavesModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceSettingsService],
  exports: [AttendanceService, AttendanceSettingsService],
})
export class AttendanceModule {}
