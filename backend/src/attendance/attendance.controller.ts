import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@CurrentUser() user: { userId: string }) {
    return this.attendanceService.checkIn(user.userId);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  checkOut(@CurrentUser() user: { userId: string }) {
    return this.attendanceService.checkOut(user.userId);
  }

  @Get('me/today')
  today(@CurrentUser() user: { userId: string }) {
    return this.attendanceService.getToday(user.userId);
  }

  @Get('me')
  listMine(
    @CurrentUser() user: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.listForUser(user.userId, from, to);
  }
}
