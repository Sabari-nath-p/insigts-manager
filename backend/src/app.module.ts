import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeavesModule } from './leaves/leaves.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { WorkLogsModule } from './worklogs/work-logs.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ClientsModule } from './clients/clients.module';
import { PayrollModule } from './payroll/payroll.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AttendanceModule,
    LeavesModule,
    UsersModule,
    AuthModule,
    HealthModule,
    ScheduledTasksModule,
    WorkLogsModule,
    KnowledgeBaseModule,
    ClientsModule,
    PayrollModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
