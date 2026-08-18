import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeavesModule } from '../leaves/leaves.module';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [AttendanceModule, LeavesModule],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
