import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersSeedService } from './users-seed.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeavesModule } from '../leaves/leaves.module';

@Module({
  imports: [AttendanceModule, LeavesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersSeedService],
  exports: [UsersService],
})
export class UsersModule {}
