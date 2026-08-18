import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EmployeeCompensation,
  PayrollEmployeeStatus,
  LeavePayrollRule,
  PayrollAdjustment,
  PayrollAdjustmentApproval,
  PayrollRecord,
  PayrollPaymentStatus,
  PayrollRecordStatus,
  PayrollAuditAction,
  PayrollAuditLog,
  PayrollSettings,
  User,
  AttendanceSettings,
  Holiday,
  LeaveType,
  Prisma,
} from '@prisma/client';
import { PayrollException } from './payroll.types';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceSettingsService } from '../attendance/attendance-settings.service';
import { isWorkingDayFor } from '../attendance/attendance.service';
import { holidayAppliesToUser, zonedDateString } from '../attendance/attendance-calculations';
import { LeavesService } from '../leaves/leaves.service';
import { SetCompensationDto } from './dto/set-compensation.dto';
import { UpdateLeaveRuleDto } from './dto/update-leave-rule.dto';
import { AddAdjustmentDto } from './dto/add-adjustment.dto';
import { FinalizePayrollDto } from './dto/finalize-payroll.dto';
import { ReopenPayrollDto } from './dto/reopen-payroll.dto';
import { UpdatePayrollSettingsDto } from './dto/update-payroll-settings.dto';
import {
  DEFAULT_LEAVE_PAYABLE_FRACTION,
  buildMonthCalendar,
  computeBaseSalaryEarned,
  computeInternalHourlyRate,
  datesInMonth,
  isDeductingAdjustment,
  minutesToHours,
  round2,
} from './payroll-calculations';
import { payrollRecordsToCsv } from './payroll-csv';

const SETTINGS_ID = 1;

function monthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function exceptionsOf(record: Pick<PayrollRecord, 'exceptions'>): PayrollException[] {
  return (record.exceptions as unknown as PayrollException[] | null) ?? [];
}

interface MonthBreakdown {
  calendarDays: number;
  weeklyOffDays: number;
  holidayDays: number;
  workingDays: number;
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  payableMinutes: number;
  extraMinutes: number;
  paidLeaveDays: number;
  medicalLeaveDays: number;
  unpaidLeaveDays: number;
  monthlySalary: number;
  internalHourlyRate: number;
  baseSalaryEarned: number;
  exceptions: PayrollException[];
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceSettingsService: AttendanceSettingsService,
    private readonly leavesService: LeavesService,
  ) {}

  // ==========================================================================
  // Compensation (salary history)
  // ==========================================================================

  getCompensationHistory(userId: string): Promise<EmployeeCompensation[]> {
    return this.prisma.employeeCompensation.findMany({ where: { userId }, orderBy: { effectiveFrom: 'desc' } });
  }

  async setCompensation(userId: string, dto: SetCompensationDto, actorId: string): Promise<EmployeeCompensation> {
    const user = await this.getUserOrFail(userId);

    const open = await this.prisma.employeeCompensation.findFirst({ where: { userId, effectiveTo: null } });
    if (open) {
      if (open.effectiveFrom >= dto.effectiveFrom) {
        throw new BadRequestException("The new effective date must be after the current compensation's effective date");
      }
      const dayBefore = new Date(`${dto.effectiveFrom}T00:00:00`);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await this.prisma.employeeCompensation.update({
        where: { id: open.id },
        data: { effectiveTo: dayBefore.toISOString().slice(0, 10) },
      });
    }

    const created = await this.prisma.employeeCompensation.create({
      data: {
        userId,
        monthlySalary: dto.monthlySalary.toFixed(2),
        standardWorkingHoursPerDay: dto.standardWorkingHoursPerDay,
        payrollStatus: dto.payrollStatus ?? PayrollEmployeeStatus.active,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: null,
        notes: dto.notes ?? null,
        createdBy: actorId,
      },
    });

    // Best-effort sync so the rest of the app (e.g. the Employee edit form) stays consistent.
    // Payroll itself never reads currentSalary back — it always calculates off this table.
    await this.prisma.user.update({ where: { id: userId }, data: { currentSalary: dto.monthlySalary.toFixed(2) } });

    await this.logAudit(
      null,
      actorId,
      PayrollAuditAction.salary_changed,
      'monthlySalary',
      open?.monthlySalary ?? null,
      created.monthlySalary,
      `Effective ${dto.effectiveFrom} for ${user.fullName}`,
    );
    return created;
  }

  private async getActiveCompensationForMonth(userId: string, month: string): Promise<EmployeeCompensation | null> {
    const { to } = monthRange(month);
    const monthStart = `${month}-01`;
    const rows = await this.prisma.employeeCompensation.findMany({ where: { userId }, orderBy: { effectiveFrom: 'desc' } });
    return rows.find((c) => c.effectiveFrom <= to && (c.effectiveTo == null || c.effectiveTo >= monthStart)) ?? null;
  }

  // ==========================================================================
  // Leave payroll rules
  // ==========================================================================

  async getLeaveRules(): Promise<LeavePayrollRule[]> {
    const existing = await this.prisma.leavePayrollRule.findMany();
    const existingTypes = new Set(existing.map((r) => r.leaveType));
    const missing = (Object.values(LeaveType) as LeaveType[]).filter((t) => !existingTypes.has(t));
    if (missing.length === 0) return existing;

    await this.prisma.leavePayrollRule.createMany({
      data: missing.map((t) => ({
        leaveType: t,
        isPayable: DEFAULT_LEAVE_PAYABLE_FRACTION[t] > 0,
        payableFraction: DEFAULT_LEAVE_PAYABLE_FRACTION[t].toFixed(3),
      })),
    });
    return this.prisma.leavePayrollRule.findMany();
  }

  private async getLeaveRuleMap(): Promise<Map<LeaveType, LeavePayrollRule>> {
    const rules = await this.getLeaveRules();
    return new Map(rules.map((r) => [r.leaveType, r]));
  }

  async updateLeaveRule(leaveType: LeaveType, dto: UpdateLeaveRuleDto, actorId: string): Promise<LeavePayrollRule> {
    await this.getLeaveRules();
    const data: Prisma.LeavePayrollRuleUpdateInput = { updatedBy: actorId };
    if (dto.isPayable !== undefined) data.isPayable = dto.isPayable;
    if (dto.payableFraction !== undefined) data.payableFraction = dto.payableFraction.toFixed(3);
    return this.prisma.leavePayrollRule.update({ where: { leaveType }, data });
  }

  // ==========================================================================
  // Company settings
  // ==========================================================================

  async getSettings(): Promise<PayrollSettings> {
    let settings = await this.prisma.payrollSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!settings) {
      settings = await this.prisma.payrollSettings.create({ data: { id: SETTINGS_ID } });
    }
    return settings;
  }

  async updateSettings(dto: UpdatePayrollSettingsDto): Promise<PayrollSettings> {
    await this.getSettings();
    return this.prisma.payrollSettings.update({ where: { id: SETTINGS_ID }, data: dto });
  }

  // ==========================================================================
  // Period preview (before calculation) — section 2
  // ==========================================================================

  async getPeriodMeta(month: string): Promise<{
    month: string;
    calendarDays: number;
    employees: Array<{
      userId: string;
      fullName: string;
      calendarDays: number;
      weeklyOffDays: number;
      holidayDays: number;
      workingDays: number;
      standardHoursPerDay: number | null;
      scheduledHours: number | null;
      hasCompensation: boolean;
    }>;
    employeesMissingCompensation: Array<{ userId: string; fullName: string }>;
  }> {
    const settings = await this.attendanceSettingsService.get();
    const { from, to } = monthRange(month);
    const holidays = await this.attendanceSettingsService.listHolidays(from, to);
    const users = await this.prisma.user.findMany({ where: { isActive: true }, orderBy: { fullName: 'asc' } });

    const employees = [];
    for (const user of users) {
      const calendar = buildMonthCalendar(
        month,
        (date) => isWorkingDayFor(user, date, settings),
        (date) => holidays.some((h) => h.date === date && h.isActive && holidayAppliesToUser(h, user.department)),
      );
      const compensation = await this.getActiveCompensationForMonth(user.id, month);
      const workingDays = calendar.filter((d) => d.isScheduledWorkingDay).length;
      const standardHoursPerDay = compensation?.standardWorkingHoursPerDay ?? null;
      employees.push({
        userId: user.id,
        fullName: user.fullName,
        calendarDays: calendar.length,
        weeklyOffDays: calendar.filter((d) => d.isWeeklyOff).length,
        holidayDays: calendar.filter((d) => d.isHoliday).length,
        workingDays,
        standardHoursPerDay,
        scheduledHours: standardHoursPerDay != null ? round2(workingDays * standardHoursPerDay) : null,
        hasCompensation: !!compensation,
      });
    }

    return {
      month,
      calendarDays: datesInMonth(month).length,
      employees,
      employeesMissingCompensation: employees.filter((e) => !e.hasCompensation).map((e) => ({ userId: e.userId, fullName: e.fullName })),
    };
  }

  // ==========================================================================
  // Calculation
  // ==========================================================================

  private async computeUserMonth(
    user: User,
    month: string,
    compensation: EmployeeCompensation,
    settings: AttendanceSettings,
    holidays: Holiday[],
    leaveRules: Map<LeaveType, LeavePayrollRule>,
  ): Promise<MonthBreakdown> {
    const { from, to } = monthRange(month);
    const today = zonedDateString();

    const calendar = buildMonthCalendar(
      month,
      (date) => isWorkingDayFor(user, date, settings),
      (date) => holidays.some((h) => h.date === date && h.isActive && holidayAppliesToUser(h, user.department)),
    );

    const records = await this.prisma.attendanceRecord.findMany({ where: { userId: user.id, date: { gte: from, lte: to } } });
    const recordByDate = new Map(records.map((r) => [r.date, r]));
    const leaves = await this.leavesService.listApprovedForUserInRange(user.id, from, to);

    const standardMinutes = Math.round(compensation.standardWorkingHoursPerDay * 60);
    let scheduledMinutes = 0;
    let actualWorkedMinutes = 0;
    let payableMinutes = 0;
    let extraMinutes = 0;
    let paidLeaveDays = 0;
    let medicalLeaveDays = 0;
    let unpaidLeaveDays = 0;
    const exceptions: PayrollException[] = [];

    for (const day of calendar) {
      if (!day.isScheduledWorkingDay) continue;
      scheduledMinutes += standardMinutes;

      const record = recordByDate.get(day.date);
      if (record && record.checkInAt && record.checkOutAt && record.workedMinutes != null) {
        actualWorkedMinutes += record.workedMinutes;
        payableMinutes += Math.min(record.workedMinutes, standardMinutes);
        extraMinutes += Math.max(0, record.workedMinutes - standardMinutes);
        continue;
      }
      if (record && record.checkInAt && !record.checkOutAt) {
        if (day.date <= today) {
          exceptions.push({ code: 'missing_checkout', message: `Missing clock-out on ${day.date}`, date: day.date });
        }
        continue;
      }
      const leave = leaves.find((l) => l.startDate <= day.date && l.endDate >= day.date);
      if (leave) {
        const rule = leaveRules.get(leave.type);
        const fraction = rule ? Number(rule.payableFraction) : DEFAULT_LEAVE_PAYABLE_FRACTION[leave.type];
        payableMinutes += Math.round(standardMinutes * fraction);
        if (leave.type === LeaveType.paid) paidLeaveDays += 1;
        else if (leave.type === LeaveType.medical) medicalLeaveDays += 1;
        else unpaidLeaveDays += 1;
        continue;
      }
      if (day.date <= today) {
        exceptions.push({ code: 'unresolved_absence', message: `No attendance or approved leave on ${day.date}`, date: day.date });
      }
    }

    const monthlySalary = Number(compensation.monthlySalary);
    const internalHourlyRate = computeInternalHourlyRate(monthlySalary, scheduledMinutes);
    const baseSalaryEarned = computeBaseSalaryEarned(payableMinutes, internalHourlyRate);

    return {
      calendarDays: calendar.length,
      weeklyOffDays: calendar.filter((d) => d.isWeeklyOff).length,
      holidayDays: calendar.filter((d) => d.isHoliday).length,
      workingDays: calendar.filter((d) => d.isScheduledWorkingDay).length,
      scheduledMinutes,
      actualWorkedMinutes,
      payableMinutes,
      extraMinutes,
      paidLeaveDays,
      medicalLeaveDays,
      unpaidLeaveDays,
      monthlySalary,
      internalHourlyRate,
      baseSalaryEarned,
      exceptions,
    };
  }

  async calculate(
    month: string,
    actorId: string,
    userIds?: string[],
  ): Promise<{ calculated: PayrollRecord[]; skipped: Array<{ userId: string; fullName: string; reason: string }> }> {
    const settings = await this.attendanceSettingsService.get();
    const { from, to } = monthRange(month);
    const holidaysRaw = await this.attendanceSettingsService.listHolidays(from, to);
    const holidays = holidaysRaw.filter((h) => h.isActive);
    const leaveRules = await this.getLeaveRuleMap();

    const users = userIds?.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } } })
      : await this.prisma.user.findMany({ where: { isActive: true } });

    const calculated: PayrollRecord[] = [];
    const skipped: Array<{ userId: string; fullName: string; reason: string }> = [];

    for (const user of users) {
      if (!user.isActive) {
        skipped.push({ userId: user.id, fullName: user.fullName, reason: 'Employee is deactivated' });
        continue;
      }

      const compensation = await this.getActiveCompensationForMonth(user.id, month);
      if (!compensation) {
        skipped.push({ userId: user.id, fullName: user.fullName, reason: 'No salary configured for this period' });
        continue;
      }
      if (compensation.payrollStatus !== PayrollEmployeeStatus.active) {
        skipped.push({ userId: user.id, fullName: user.fullName, reason: `Payroll status is "${compensation.payrollStatus}"` });
        continue;
      }

      const existing = await this.prisma.payrollRecord.findUnique({ where: { userId_payrollMonth: { userId: user.id, payrollMonth: month } } });
      if (existing && existing.status === PayrollRecordStatus.finalized) {
        skipped.push({ userId: user.id, fullName: user.fullName, reason: 'Already finalized — reopen it first to recalculate' });
        continue;
      }

      const breakdown = await this.computeUserMonth(user, month, compensation, settings, holidays, leaveRules);

      const data = {
        calendarDays: breakdown.calendarDays,
        weeklyOffDays: breakdown.weeklyOffDays,
        holidayDays: breakdown.holidayDays,
        workingDays: breakdown.workingDays,
        standardHoursPerDay: compensation.standardWorkingHoursPerDay,
        scheduledMinutes: breakdown.scheduledMinutes,
        actualWorkedMinutes: breakdown.actualWorkedMinutes,
        payableMinutes: breakdown.payableMinutes,
        extraMinutes: breakdown.extraMinutes,
        paidLeaveDays: breakdown.paidLeaveDays,
        medicalLeaveDays: breakdown.medicalLeaveDays,
        unpaidLeaveDays: breakdown.unpaidLeaveDays,
        monthlySalaryUsed: breakdown.monthlySalary.toFixed(2),
        internalHourlyRate: breakdown.internalHourlyRate.toFixed(4),
        baseSalaryEarned: breakdown.baseSalaryEarned.toFixed(2),
        exceptions: (breakdown.exceptions.length ? breakdown.exceptions : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        status: PayrollRecordStatus.calculated,
        calculatedBy: actorId,
        calculatedAt: new Date(),
      };

      const saved = existing
        ? await this.prisma.payrollRecord.update({ where: { id: existing.id }, data })
        : await this.prisma.payrollRecord.create({
            data: { ...data, userId: user.id, payrollMonth: month, additionsTotal: '0.00', deductionsTotal: '0.00', finalPayableAmount: breakdown.baseSalaryEarned.toFixed(2) },
          });

      if (existing) {
        await this.recalculateAdjustmentTotals(saved);
      }
      await this.logAudit(
        saved.id,
        actorId,
        existing ? PayrollAuditAction.recalculated : PayrollAuditAction.calculated,
        null,
        null,
        null,
        null,
      );
      calculated.push(saved);
    }

    return { calculated, skipped };
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  private async getRecordOrFail(id: string): Promise<PayrollRecord> {
    const record = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Payroll record not found');
    return record;
  }

  async markUnderReview(id: string, actorId: string): Promise<PayrollRecord> {
    const record = await this.getRecordOrFail(id);
    if (record.status !== PayrollRecordStatus.calculated) {
      throw new BadRequestException('Only a calculated payroll record can be submitted for review');
    }
    const saved = await this.prisma.payrollRecord.update({ where: { id }, data: { status: PayrollRecordStatus.under_review } });
    await this.logAudit(saved.id, actorId, PayrollAuditAction.under_review, null, null, null, null);
    return saved;
  }

  async approve(id: string, actorId: string): Promise<PayrollRecord> {
    const record = await this.getRecordOrFail(id);
    if (record.status !== PayrollRecordStatus.calculated && record.status !== PayrollRecordStatus.under_review) {
      throw new BadRequestException('Only a calculated or under-review payroll record can be approved');
    }
    const saved = await this.prisma.payrollRecord.update({
      where: { id },
      data: { status: PayrollRecordStatus.approved, approvedBy: actorId, approvedAt: new Date() },
    });
    await this.logAudit(saved.id, actorId, PayrollAuditAction.approved, null, null, null, null);
    return saved;
  }

  async finalize(id: string, actorId: string, dto: FinalizePayrollDto): Promise<PayrollRecord> {
    const record = await this.getRecordOrFail(id);
    if (record.status === PayrollRecordStatus.finalized) {
      throw new ConflictException('Payroll record is already finalized');
    }
    if (record.status !== PayrollRecordStatus.approved) {
      throw new BadRequestException('Only an approved payroll record can be finalized');
    }
    const hasExceptions = exceptionsOf(record).length > 0;
    if (hasExceptions && !dto.overrideReason) {
      throw new BadRequestException('Resolve payroll exceptions or provide an override reason before finalizing');
    }
    const saved = await this.prisma.payrollRecord.update({
      where: { id },
      data: { status: PayrollRecordStatus.finalized, finalizedBy: actorId, finalizedAt: new Date() },
    });
    await this.logAudit(saved.id, actorId, PayrollAuditAction.finalized, null, null, null, dto.overrideReason ?? null);
    return saved;
  }

  async markPaid(id: string, actorId: string): Promise<PayrollRecord> {
    const record = await this.getRecordOrFail(id);
    if (record.status !== PayrollRecordStatus.finalized) {
      throw new BadRequestException('Only a finalized payroll record can be marked as paid');
    }
    if (record.paymentStatus === PayrollPaymentStatus.paid) {
      throw new ConflictException('Payroll record is already marked as paid');
    }
    const saved = await this.prisma.payrollRecord.update({
      where: { id },
      data: { paymentStatus: PayrollPaymentStatus.paid, paidBy: actorId, paidAt: new Date() },
    });
    await this.logAudit(saved.id, actorId, PayrollAuditAction.marked_paid, null, null, null, null);
    return saved;
  }

  async reopen(id: string, actorId: string, dto: ReopenPayrollDto): Promise<PayrollRecord> {
    const record = await this.getRecordOrFail(id);
    if (record.status !== PayrollRecordStatus.finalized) {
      throw new BadRequestException('Only a finalized payroll record can be reopened');
    }
    const saved = await this.prisma.payrollRecord.update({
      where: { id },
      data: {
        status: PayrollRecordStatus.approved,
        finalizedBy: null,
        finalizedAt: null,
        paymentStatus: PayrollPaymentStatus.pending,
        paidBy: null,
        paidAt: null,
      },
    });
    await this.logAudit(saved.id, actorId, PayrollAuditAction.reopened, null, null, null, dto.reason);
    return saved;
  }

  // ==========================================================================
  // Adjustments
  // ==========================================================================

  async addAdjustment(recordId: string, actorId: string, dto: AddAdjustmentDto): Promise<PayrollAdjustment> {
    const record = await this.getRecordOrFail(recordId);
    if (record.status === PayrollRecordStatus.finalized) {
      throw new BadRequestException('Reopen this payroll record before adding adjustments');
    }
    const adjustment = await this.prisma.payrollAdjustment.create({
      data: {
        payrollRecordId: recordId,
        type: dto.type,
        amount: dto.amount.toFixed(2),
        reason: dto.reason,
        addedBy: actorId,
        isEmployeeVisible: dto.isEmployeeVisible ?? false,
        remarks: dto.remarks ?? null,
      },
    });
    await this.recalculateAdjustmentTotals(record);
    await this.logAudit(recordId, actorId, PayrollAuditAction.adjustment_added, dto.type, null, dto.amount.toFixed(2), dto.reason);
    return adjustment;
  }

  async removeAdjustment(recordId: string, adjustmentId: string, actorId: string): Promise<void> {
    const record = await this.getRecordOrFail(recordId);
    if (record.status === PayrollRecordStatus.finalized) {
      throw new BadRequestException('Reopen this payroll record before removing adjustments');
    }
    const adjustment = await this.prisma.payrollAdjustment.findFirst({ where: { id: adjustmentId, payrollRecordId: recordId } });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    await this.prisma.payrollAdjustment.delete({ where: { id: adjustment.id } });
    await this.recalculateAdjustmentTotals(record);
    await this.logAudit(recordId, actorId, PayrollAuditAction.adjustment_removed, adjustment.type, adjustment.amount, null, adjustment.reason);
  }

  listAdjustments(recordId: string): Promise<PayrollAdjustment[]> {
    return this.prisma.payrollAdjustment.findMany({ where: { payrollRecordId: recordId }, orderBy: { createdAt: 'desc' } });
  }

  private async recalculateAdjustmentTotals(record: PayrollRecord): Promise<void> {
    const adjustments = await this.prisma.payrollAdjustment.findMany({
      where: { payrollRecordId: record.id, approvalStatus: PayrollAdjustmentApproval.approved },
    });
    let additions = 0;
    let deductions = 0;
    for (const a of adjustments) {
      if (isDeductingAdjustment(a.type)) deductions += Number(a.amount);
      else additions += Number(a.amount);
    }
    await this.prisma.payrollRecord.update({
      where: { id: record.id },
      data: {
        additionsTotal: round2(additions).toFixed(2),
        deductionsTotal: round2(deductions).toFixed(2),
        finalPayableAmount: round2(Number(record.baseSalaryEarned) + additions - deductions).toFixed(2),
      },
    });
  }

  // ==========================================================================
  // Admin retrieval
  // ==========================================================================

  async adminGetRecord(id: string): Promise<{ record: PayrollRecord; fullName: string; adjustments: PayrollAdjustment[] }> {
    const record = await this.getRecordOrFail(id);
    const user = await this.getUserOrFail(record.userId);
    const adjustments = await this.listAdjustments(id);
    return { record, fullName: user.fullName, adjustments };
  }

  async adminListRecords(filters: { month?: string; status?: PayrollRecordStatus; search?: string; hasExceptions?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.month) where.payrollMonth = filters.month;
    if (filters.status) where.status = filters.status;
    const records = await this.prisma.payrollRecord.findMany({ where, orderBy: { payrollMonth: 'desc' } });

    const userIds = Array.from(new Set(records.map((r) => r.userId)));
    const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    let rows = records.map((r) => ({
      ...r,
      fullName: userById.get(r.userId)?.fullName ?? 'Unknown',
      department: userById.get(r.userId)?.department ?? null,
      exceptionsCount: exceptionsOf(r).length,
    }));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter((r) => r.fullName.toLowerCase().includes(q));
    }
    if (filters.hasExceptions === 'true') {
      rows = rows.filter((r) => r.exceptionsCount > 0);
    }

    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  auditTrail(recordId: string): Promise<PayrollAuditLog[]> {
    return this.prisma.payrollAuditLog.findMany({ where: { payrollRecordId: recordId }, orderBy: { changedAt: 'desc' } });
  }

  async exportRecordsCsv(month: string): Promise<string> {
    const rows = await this.adminListRecords({ month });
    return payrollRecordsToCsv(
      rows.map((r) => ({
        fullName: r.fullName,
        payrollMonth: r.payrollMonth,
        workingDays: r.workingDays,
        scheduledHours: minutesToHours(r.scheduledMinutes),
        actualHours: minutesToHours(r.actualWorkedMinutes),
        payableHours: minutesToHours(r.payableMinutes),
        extraHours: minutesToHours(r.extraMinutes),
        baseSalaryEarned: r.baseSalaryEarned,
        finalPayableAmount: r.finalPayableAmount,
        status: r.status,
        paymentStatus: r.paymentStatus,
      })),
    );
  }

  async adminDashboard(month: string) {
    const records = await this.prisma.payrollRecord.findMany({ where: { payrollMonth: month } });
    const totalEmployees = await this.prisma.user.count({ where: { isActive: true } });
    const totalPayroll = records.reduce((s, r) => s + Number(r.finalPayableAmount), 0);

    return {
      month,
      totalEmployees,
      payrollRecordsCount: records.length,
      totalPayroll: round2(totalPayroll),
      totalScheduledHours: minutesToHours(records.reduce((s, r) => s + r.scheduledMinutes, 0)),
      totalPayableHours: minutesToHours(records.reduce((s, r) => s + r.payableMinutes, 0)),
      totalActualHours: minutesToHours(records.reduce((s, r) => s + r.actualWorkedMinutes, 0)),
      totalExtraHours: minutesToHours(records.reduce((s, r) => s + r.extraMinutes, 0)),
      employeesWithShortHours: records.filter((r) => r.payableMinutes < r.scheduledMinutes).length,
      employeesWithFullHours: records.filter((r) => r.payableMinutes >= r.scheduledMinutes).length,
      employeesWithAttendanceIssues: records.filter((r) => exceptionsOf(r).length > 0).length,
      employeesWithMissingAttendance: records.filter((r) =>
        exceptionsOf(r).some((e) => e.code === 'missing_checkout' || e.code === 'unresolved_absence'),
      ).length,
      payrollPending: records.filter((r) => r.status === PayrollRecordStatus.calculated).length,
      payrollUnderReview: records.filter((r) => r.status === PayrollRecordStatus.under_review).length,
      payrollApproved: records.filter((r) => r.status === PayrollRecordStatus.approved).length,
      // Paid is a subset of Finalized (every paid record is also finalized), matching the display
      // convention in the record detail view where a paid record's Payroll Status pill still reads
      // "Finalized" — these two counters intentionally overlap rather than partition the records.
      payrollFinalized: records.filter((r) => r.status === PayrollRecordStatus.finalized).length,
      payrollPaid: records.filter((r) => r.paymentStatus === PayrollPaymentStatus.paid).length,
    };
  }

  // ==========================================================================
  // Employee-facing (My Payroll) — response is hand-picked, never the raw entity
  // ==========================================================================

  private toEmployeeSummary(record: PayrollRecord, adjustments: PayrollAdjustment[]) {
    const visible = adjustments.filter((a) => a.isEmployeeVisible && a.approvalStatus === PayrollAdjustmentApproval.approved);
    const netVisible = visible.reduce((s, a) => s + (isDeductingAdjustment(a.type) ? -Number(a.amount) : Number(a.amount)), 0);
    return {
      id: record.id,
      payrollMonth: record.payrollMonth,
      workingDays: record.workingDays,
      scheduledHours: minutesToHours(record.scheduledMinutes),
      actualHours: minutesToHours(record.actualWorkedMinutes),
      payableHours: minutesToHours(record.payableMinutes),
      extraHours: minutesToHours(record.extraMinutes),
      payrollAmount: round2(Number(record.baseSalaryEarned) + netVisible),
      status: record.status,
      paymentStatus: record.paymentStatus,
      visibleAdjustments: visible.map((a) => ({ type: a.type, amount: a.amount, reason: a.reason, date: a.createdAt })),
    };
  }

  async listForEmployee(userId: string) {
    const records = await this.prisma.payrollRecord.findMany({
      where: { userId, status: PayrollRecordStatus.finalized },
      orderBy: { payrollMonth: 'desc' },
    });
    const result = [];
    for (const record of records) {
      const adjustments = await this.listAdjustments(record.id);
      result.push(this.toEmployeeSummary(record, adjustments));
    }
    return result;
  }

  async getForEmployee(userId: string, recordId: string) {
    const record = await this.getRecordOrFail(recordId);
    if (record.userId !== userId) throw new ForbiddenException("You cannot view another employee's payroll");
    if (record.status !== PayrollRecordStatus.finalized) throw new ForbiddenException('This payroll record is not yet finalized');
    const adjustments = await this.listAdjustments(recordId);
    return this.toEmployeeSummary(record, adjustments);
  }

  async getPayslip(userId: string, recordId: string) {
    const settings = await this.getSettings();
    if (!settings.payslipEnabled) throw new ForbiddenException('Payslips are not enabled for this company');
    const record = await this.getRecordOrFail(recordId);
    if (record.userId !== userId) throw new ForbiddenException("You cannot view another employee's payslip");
    if (record.status !== PayrollRecordStatus.finalized) throw new ForbiddenException('This payroll record is not yet finalized');

    const user = await this.getUserOrFail(userId);
    const adjustments = (await this.listAdjustments(recordId)).filter(
      (a) => a.isEmployeeVisible && a.approvalStatus === PayrollAdjustmentApproval.approved,
    );
    const additions = adjustments.filter((a) => !isDeductingAdjustment(a.type));
    const deductions = adjustments.filter((a) => isDeductingAdjustment(a.type));
    const netAdjustments =
      additions.reduce((s, a) => s + Number(a.amount), 0) - deductions.reduce((s, a) => s + Number(a.amount), 0);

    return {
      employeeName: user.fullName,
      employeeId: user.id,
      designation: user.designation,
      department: user.department,
      payrollMonth: record.payrollMonth,
      workingDays: record.workingDays,
      scheduledHours: minutesToHours(record.scheduledMinutes),
      actualHours: minutesToHours(record.actualWorkedMinutes),
      payableHours: minutesToHours(record.payableMinutes),
      extraHours: minutesToHours(record.extraMinutes),
      baseSalaryEarned: record.baseSalaryEarned,
      approvedAdditions: additions.map((a) => ({ type: a.type, amount: a.amount, reason: a.reason })),
      approvedDeductions: deductions.map((a) => ({ type: a.type, amount: a.amount, reason: a.reason })),
      finalPayableAmount: round2(Number(record.baseSalaryEarned) + netAdjustments).toFixed(2),
      paymentStatus: record.paymentStatus,
    };
  }

  // ==========================================================================
  // Shared
  // ==========================================================================

  private async getUserOrFail(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async logAudit(
    payrollRecordId: string | null,
    actorId: string,
    action: PayrollAuditAction,
    field: string | null,
    oldValue: string | null,
    newValue: string | null,
    reason: string | null,
  ): Promise<void> {
    await this.prisma.payrollAuditLog.create({ data: { payrollRecordId, actorId, action, field, oldValue, newValue, reason } });
  }
}
