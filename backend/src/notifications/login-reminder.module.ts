import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeavesModule } from '../leaves/leaves.module';
import { UsersModule } from '../users/users.module';
import { LoginReminderController, LoginReminderJob } from './login-reminder.job';

/** Kept apart from NotificationsModule because it needs attendance, users and leaves. */
@Module({
  imports: [UsersModule, AttendanceModule, LeavesModule],
  controllers: [LoginReminderController],
  providers: [LoginReminderJob],
})
export class LoginReminderModule {}
