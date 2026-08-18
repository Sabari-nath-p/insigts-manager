import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { LeaveType } from '@prisma/client';
import { PayrollRecordStatus } from '@prisma/client';
import { PayrollService } from './payroll.service';
import { SetCompensationDto } from './dto/set-compensation.dto';
import { UpdateLeaveRuleDto } from './dto/update-leave-rule.dto';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { AddAdjustmentDto } from './dto/add-adjustment.dto';
import { FinalizePayrollDto } from './dto/finalize-payroll.dto';
import { ReopenPayrollDto } from './dto/reopen-payroll.dto';
import { UpdatePayrollSettingsDto } from './dto/update-payroll-settings.dto';

type ReqUser = { userId: string; role: UserRole };

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ==========================================================================
  // Employee-facing — self only, finalized records only, never the internal rate
  // ==========================================================================

  @Get('me')
  listMine(@CurrentUser() user: ReqUser) {
    return this.payrollService.listForEmployee(user.userId);
  }

  @Get('me/:id')
  getMine(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.payrollService.getForEmployee(user.userId, id);
  }

  @Get('me/:id/payslip')
  getMyPayslip(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.payrollService.getPayslip(user.userId, id);
  }

  // ==========================================================================
  // Admin — super_admin only (per the confirmed scope: managers get the plain employee view)
  // ==========================================================================

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/period-meta')
  getPeriodMeta(@Query('month') month: string) {
    return this.payrollService.getPeriodMeta(month);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/calculate')
  calculate(@CurrentUser() admin: ReqUser, @Body() dto: CalculatePayrollDto) {
    return this.payrollService.calculate(dto.month, admin.userId, dto.userIds);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/dashboard')
  dashboard(@Query('month') month: string) {
    return this.payrollService.adminDashboard(month);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/records')
  listRecords(
    @Query('month') month?: string,
    @Query('status') status?: PayrollRecordStatus,
    @Query('search') search?: string,
    @Query('hasExceptions') hasExceptions?: string,
  ) {
    return this.payrollService.adminListRecords({ month, status, search, hasExceptions });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/records/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="payroll.csv"')
  exportRecords(@Query('month') month: string) {
    return this.payrollService.exportRecordsCsv(month);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/records/:id')
  getRecord(@Param('id') id: string) {
    return this.payrollService.adminGetRecord(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/records/:id/audit')
  auditTrail(@Param('id') id: string) {
    return this.payrollService.auditTrail(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/records/:id/under-review')
  markUnderReview(@CurrentUser() admin: ReqUser, @Param('id') id: string) {
    return this.payrollService.markUnderReview(id, admin.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/records/:id/approve')
  approve(@CurrentUser() admin: ReqUser, @Param('id') id: string) {
    return this.payrollService.approve(id, admin.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/records/:id/finalize')
  finalize(@CurrentUser() admin: ReqUser, @Param('id') id: string, @Body() dto: FinalizePayrollDto) {
    return this.payrollService.finalize(id, admin.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/records/:id/mark-paid')
  markPaid(@CurrentUser() admin: ReqUser, @Param('id') id: string) {
    return this.payrollService.markPaid(id, admin.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/records/:id/reopen')
  reopen(@CurrentUser() admin: ReqUser, @Param('id') id: string, @Body() dto: ReopenPayrollDto) {
    return this.payrollService.reopen(id, admin.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/records/:id/adjustments')
  addAdjustment(@CurrentUser() admin: ReqUser, @Param('id') id: string, @Body() dto: AddAdjustmentDto) {
    return this.payrollService.addAdjustment(id, admin.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Delete('admin/records/:id/adjustments/:adjustmentId')
  removeAdjustment(@CurrentUser() admin: ReqUser, @Param('id') id: string, @Param('adjustmentId') adjustmentId: string) {
    return this.payrollService.removeAdjustment(id, adjustmentId, admin.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/compensation/:userId')
  getCompensation(@Param('userId') userId: string) {
    return this.payrollService.getCompensationHistory(userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('admin/compensation/:userId')
  setCompensation(@CurrentUser() admin: ReqUser, @Param('userId') userId: string, @Body() dto: SetCompensationDto) {
    return this.payrollService.setCompensation(userId, dto, admin.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/leave-rules')
  getLeaveRules() {
    return this.payrollService.getLeaveRules();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Patch('admin/leave-rules/:leaveType')
  updateLeaveRule(@CurrentUser() admin: ReqUser, @Param('leaveType') leaveType: LeaveType, @Body() dto: UpdateLeaveRuleDto) {
    return this.payrollService.updateLeaveRule(leaveType, dto, admin.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('admin/settings')
  getSettings() {
    return this.payrollService.getSettings();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Patch('admin/settings')
  updateSettings(@Body() dto: UpdatePayrollSettingsDto) {
    return this.payrollService.updateSettings(dto);
  }
}
