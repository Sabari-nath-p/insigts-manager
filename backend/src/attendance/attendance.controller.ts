import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { AttendanceSettingsService } from './attendance-settings.service';
import { AttendanceStatus } from '@prisma/client';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto';
import { UpdateAttendanceSettingsDto } from './dto/update-attendance-settings.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { DuplicateHolidaysDto } from './dto/duplicate-holidays.dto';
import { ImportHolidaysDto } from './dto/import-holidays.dto';

function parseBool(value?: string): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'true';
}

function parsePage(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly settingsService: AttendanceSettingsService,
  ) {}

  @Post('check-in')
  checkIn(@CurrentUser() user: { userId: string }) {
    return this.attendanceService.checkIn(user.userId);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  checkOut(@CurrentUser() user: { userId: string }) {
    return this.attendanceService.checkOut(user.userId);
  }

  @Post('break-start')
  @HttpCode(HttpStatus.OK)
  breakStart(@CurrentUser() user: { userId: string }) {
    return this.attendanceService.breakStart(user.userId);
  }

  @Post('break-end')
  @HttpCode(HttpStatus.OK)
  breakEnd(@CurrentUser() user: { userId: string }) {
    return this.attendanceService.breakEnd(user.userId);
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
    @Query('month') month?: string,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.attendanceService.listForUser(user.userId, { from, to, month, status });
  }

  // --- Super admin: settings ---

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('settings')
  getSettings() {
    return this.settingsService.get();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Patch('settings')
  updateSettings(@Body() dto: UpdateAttendanceSettingsDto) {
    return this.settingsService.update(dto);
  }

  // --- Holidays (viewable by anyone signed in; management is super-admin only) ---

  @Get('holidays')
  listHolidays(@Query('from') from?: string, @Query('to') to?: string) {
    return this.settingsService.listHolidays(from, to);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('holidays/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="holiday-calendar.csv"')
  async exportHolidays(@Query('from') from?: string, @Query('to') to?: string) {
    return this.settingsService.exportHolidaysCsv(from, to);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('holidays')
  createHoliday(@Body() dto: CreateHolidayDto) {
    return this.settingsService.createHoliday(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('holidays/duplicate')
  duplicateHolidays(@Body() dto: DuplicateHolidaysDto) {
    return this.settingsService.duplicateHolidays(dto.sourceYear, dto.targetYear);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('holidays/import')
  importHolidays(@Body() dto: ImportHolidaysDto) {
    return this.settingsService.importHolidaysCsv(dto.csv);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('holidays/restore-defaults')
  restoreDefaultHolidays() {
    return this.settingsService.restoreDefaultHolidays();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Patch('holidays/:id')
  updateHoliday(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.settingsService.updateHoliday(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Delete('holidays/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHoliday(@Param('id') id: string) {
    await this.settingsService.deleteHoliday(id);
  }

  // --- Super admin: attendance management ---

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/summary')
  adminSummary(@Query('date') date?: string) {
    return this.attendanceService.adminSummary(date);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/overview')
  adminOverview(
    @Query('employeeId') employeeId?: string,
    @Query('department') department?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.attendanceService.adminOverview({
      employeeId,
      department,
      role,
      search,
      date,
      page: parsePage(page, 1),
      pageSize: parsePage(pageSize, 20),
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/matrix')
  adminMatrix(
    @Query('employeeId') employeeId?: string,
    @Query('department') department?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.attendanceService.adminMatrix({
      employeeId,
      department,
      role,
      search,
      month,
      page: parsePage(page, 1),
      pageSize: parsePage(pageSize, 15),
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/records')
  adminRecords(
    @Query('employeeId') employeeId?: string,
    @Query('department') department?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('month') month?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('onlyLate') onlyLate?: string,
    @Query('onlyEarlyCheckout') onlyEarlyCheckout?: string,
    @Query('onlyOvertime') onlyOvertime?: string,
    @Query('onlyCurrentlyWorking') onlyCurrentlyWorking?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.attendanceService.adminListRecords({
      employeeId,
      department,
      role,
      search,
      date,
      from,
      to,
      month,
      status,
      onlyLate: parseBool(onlyLate),
      onlyEarlyCheckout: parseBool(onlyEarlyCheckout),
      onlyOvertime: parseBool(onlyOvertime),
      onlyCurrentlyWorking: parseBool(onlyCurrentlyWorking),
      page: parsePage(page, 1),
      pageSize: parsePage(pageSize, 50),
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/analytics')
  analytics(@Query('from') from: string, @Query('to') to: string) {
    return this.attendanceService.analytics(from, to);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/employees/:id')
  employeeDetail(@Param('id') id: string, @Query('month') month?: string) {
    return this.attendanceService.employeeDetail(id, month);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Patch('admin/records/:id')
  correctRecord(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: CorrectAttendanceDto,
  ) {
    return this.attendanceService.correctRecord(admin.userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/records/:id/audit')
  auditTrail(@Param('id') id: string) {
    return this.attendanceService.auditTrail(id);
  }
}
