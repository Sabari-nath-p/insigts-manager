import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkLog, WorkLogStatus, User, UserRole, Holiday } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveWorkLogDto } from './dto/save-work-log.dto';
import { ReviewWorkLogDto, WorkLogReviewDecision } from './dto/review-work-log.dto';
import { AttendanceSettingsService } from '../attendance/attendance-settings.service';
import { isWorkingDayFor } from '../attendance/attendance.service';
import { holidayAppliesToUser, zonedDateString } from '../attendance/attendance-calculations';
import { LeavesService } from '../leaves/leaves.service';

const MAX_MATRIX_CELLS = 4000; // users x days safety cap for analytics queries
const REPEATED_MISSING_THRESHOLD = 3;

/** "Today" in the company's operating timezone (APP_TIMEZONE) — not the server process's local date or UTC. */
function todayDateString(): string {
  return zonedDateString();
}

function firstDayOfCurrentMonth(): string {
  return `${zonedDateString().slice(0, 7)}-01`;
}

function dateRangeInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export interface WorkLogWithEmployee extends WorkLog {
  employeeName: string;
  employeeDepartment: string | null;
}

export interface PendingSubmissionsResult {
  date: string;
  totalRequired: number;
  submittedCount: number;
  pendingCount: number;
  pending: Array<{ id: string; fullName: string; department: string | null; lastSubmittedDate: string | null }>;
}

export interface WorkLogAnalyticsResult {
  period: { from: string; to: string };
  totalExpected: number;
  submitted: number;
  pending: number;
  reviewed: number;
  returned: number;
  submissionPercentage: number;
  averageHours: number;
  repeatedMissingEmployees: Array<{ id: string; fullName: string; missingDays: number }>;
}

@Injectable()
export class WorkLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: AttendanceSettingsService,
    private readonly leavesService: LeavesService,
  ) {}

  private async getUserOrFail(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async getOwnedOrFail(userId: string, id: string): Promise<WorkLog> {
    const log = await this.prisma.workLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Work log not found');
    if (log.userId !== userId) throw new ForbiddenException('You can only access your own work log');
    return log;
  }

  /** Ids of employees a reviewer may act on. null means unrestricted (super admin). */
  private async reviewableUserIds(reviewerId: string, role: UserRole): Promise<string[] | null> {
    if (role === UserRole.super_admin) return null;
    const reports = await this.prisma.user.findMany({ where: { managerId: reviewerId }, select: { id: true } });
    return reports.map((u) => u.id);
  }

  // ==========================================================================
  // Employee self-service
  // ==========================================================================

  /** Creates or updates the draft/returned log for one date. Read-only once submitted or reviewed. */
  async upsert(userId: string, dto: SaveWorkLogDto): Promise<WorkLog> {
    if (dto.date > todayDateString()) {
      throw new BadRequestException('Cannot log work for a future date');
    }
    const existing = await this.prisma.workLog.findUnique({ where: { userId_date: { userId, date: dto.date } } });
    if (existing && existing.status !== WorkLogStatus.draft && existing.status !== WorkLogStatus.returned) {
      throw new BadRequestException('This log has already been submitted and can no longer be edited');
    }

    const fields = {
      tasksCompleted: dto.tasksCompleted,
      blockers: dto.blockers ?? null,
      totalHoursWorked: dto.totalHoursWorked != null ? dto.totalHoursWorked.toString() : null,
      meetingSummary: dto.meetingSummary ?? null,
    };

    if (existing) {
      return this.prisma.workLog.update({ where: { id: existing.id }, data: fields });
    }
    return this.prisma.workLog.create({ data: { userId, date: dto.date, status: WorkLogStatus.draft, ...fields } });
  }

  async submit(userId: string, id: string): Promise<WorkLog> {
    const log = await this.getOwnedOrFail(userId, id);
    if (log.status !== WorkLogStatus.draft && log.status !== WorkLogStatus.returned) {
      throw new BadRequestException('Only a draft or returned log can be submitted');
    }
    if (!log.tasksCompleted?.trim()) {
      throw new BadRequestException('Tasks completed is required before submitting');
    }
    return this.prisma.workLog.update({
      where: { id: log.id },
      data: { status: WorkLogStatus.submitted, submittedAt: new Date() },
    });
  }

  getForDate(userId: string, date: string): Promise<WorkLog | null> {
    return this.prisma.workLog.findUnique({ where: { userId_date: { userId, date } } });
  }

  getToday(userId: string): Promise<WorkLog | null> {
    return this.getForDate(userId, todayDateString());
  }

  listForUser(userId: string, opts: { from?: string; to?: string } = {}): Promise<WorkLog[]> {
    const today = todayDateString();
    const from = opts.from ?? firstDayOfCurrentMonth();
    const to = opts.to ?? today;
    return this.prisma.workLog.findMany({ where: { userId, date: { gte: from, lte: to } }, orderBy: { date: 'desc' } });
  }

  // ==========================================================================
  // Manager / Super Admin review
  // ==========================================================================

  async listForReviewer(
    reviewerId: string,
    role: UserRole,
    filters: { employeeId?: string; department?: string; status?: WorkLogStatus; from?: string; to?: string; search?: string },
  ): Promise<WorkLogWithEmployee[]> {
    const scopedIds = await this.reviewableUserIds(reviewerId, role);

    let idFilter: string[] | undefined = scopedIds ?? undefined;
    if (filters.employeeId) {
      if (idFilter && !idFilter.includes(filters.employeeId)) return [];
      idFilter = [filters.employeeId];
    }

    const userWhere: Record<string, unknown> = {};
    if (idFilter) userWhere.id = { in: idFilter };
    if (filters.department) userWhere.department = filters.department;
    let users = idFilter && idFilter.length === 0 ? [] : await this.prisma.user.findMany({ where: userWhere });
    if (filters.search) {
      const q = filters.search.toLowerCase();
      users = users.filter((u) => u.fullName.toLowerCase().includes(q));
    }
    if (!users.length) return [];

    const userIds = users.map((u) => u.id);
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    const deptById = new Map(users.map((u) => [u.id, u.department]));

    // Drafts are a private in-progress workspace — reviewers only ever see logs once submitted.
    const where: Record<string, unknown> = {
      userId: { in: userIds },
      status: filters.status ?? { in: [WorkLogStatus.submitted, WorkLogStatus.reviewed, WorkLogStatus.returned] },
    };
    if (filters.from && filters.to) where.date = { gte: filters.from, lte: filters.to };
    const logs = await this.prisma.workLog.findMany({ where, orderBy: { date: 'desc' } });

    return logs.map((log) => ({
      ...log,
      employeeName: nameById.get(log.userId) ?? 'Unknown',
      employeeDepartment: deptById.get(log.userId) ?? null,
    }));
  }

  async review(reviewerId: string, role: UserRole, id: string, dto: ReviewWorkLogDto): Promise<WorkLog> {
    const log = await this.prisma.workLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Work log not found');
    if (log.status !== WorkLogStatus.submitted) {
      throw new BadRequestException('Only a submitted log can be reviewed');
    }
    if (role === UserRole.manager) {
      const target = await this.getUserOrFail(log.userId);
      if (target.managerId !== reviewerId) {
        throw new ForbiddenException('You can only review work logs for your direct reports');
      }
    }
    return this.prisma.workLog.update({
      where: { id },
      data: {
        status: dto.decision === WorkLogReviewDecision.REVIEWED ? WorkLogStatus.reviewed : WorkLogStatus.returned,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewComment: dto.comment ?? null,
      },
    });
  }

  async pendingSubmissions(reviewerId: string, role: UserRole, date: string = todayDateString()): Promise<PendingSubmissionsResult> {
    const scopedIds = await this.reviewableUserIds(reviewerId, role);
    const userWhere: Record<string, unknown> = { isActive: true };
    if (scopedIds) userWhere.id = { in: scopedIds.length ? scopedIds : ['00000000-0000-0000-0000-000000000000'] };
    const users = scopedIds && scopedIds.length === 0 ? [] : await this.prisma.user.findMany({ where: userWhere, orderBy: { fullName: 'asc' } });
    if (!users.length) return { date, totalRequired: 0, submittedCount: 0, pendingCount: 0, pending: [] };

    const [settings, holidays, leaveFlags, logsToday] = await Promise.all([
      this.settingsService.get(),
      this.settingsService.listHolidays(date, date),
      Promise.all(users.map((u) => this.leavesService.hasLeaveCoveringDate(u.id, date))),
      this.prisma.workLog.findMany({ where: { userId: { in: users.map((u) => u.id) }, date } }),
    ]);
    const activeHolidays = holidays.filter((h) => h.isActive);
    const onLeaveByUser = new Map(users.map((u, i) => [u.id, leaveFlags[i]]));
    const submittedByUser = new Set(
      logsToday.filter((l) => l.status === WorkLogStatus.submitted || l.status === WorkLogStatus.reviewed).map((l) => l.userId),
    );

    const required = users.filter((user) => {
      if (!isWorkingDayFor(user, date, settings)) return false;
      if (activeHolidays.some((h) => holidayAppliesToUser(h, user.department))) return false;
      if (onLeaveByUser.get(user.id)) return false;
      return true;
    });

    const pendingUsers = required.filter((u) => !submittedByUser.has(u.id));
    const lastSubmittedDates = await Promise.all(pendingUsers.map((u) => this.lastSubmittedDate(u.id, date)));

    return {
      date,
      totalRequired: required.length,
      submittedCount: required.length - pendingUsers.length,
      pendingCount: pendingUsers.length,
      pending: pendingUsers.map((u, i) => ({
        id: u.id,
        fullName: u.fullName,
        department: u.department,
        lastSubmittedDate: lastSubmittedDates[i],
      })),
    };
  }

  private async lastSubmittedDate(userId: string, beforeDate: string): Promise<string | null> {
    const log = await this.prisma.workLog.findFirst({
      where: { userId, status: { in: [WorkLogStatus.submitted, WorkLogStatus.reviewed] }, date: { lt: beforeDate } },
      orderBy: { date: 'desc' },
    });
    return log?.date ?? null;
  }

  // ==========================================================================
  // Super admin analytics
  // ==========================================================================

  async analytics(filters: { from?: string; to?: string; department?: string } = {}): Promise<WorkLogAnalyticsResult> {
    const today = todayDateString();
    const to = filters.to ?? today;
    const from = filters.from ?? firstDayOfCurrentMonth();

    const userWhere: Record<string, unknown> = { isActive: true };
    if (filters.department) userWhere.department = filters.department;
    const users = await this.prisma.user.findMany({ where: userWhere });
    const empty: WorkLogAnalyticsResult = {
      period: { from, to },
      totalExpected: 0,
      submitted: 0,
      pending: 0,
      reviewed: 0,
      returned: 0,
      submissionPercentage: 0,
      averageHours: 0,
      repeatedMissingEmployees: [],
    };
    if (!users.length) return empty;

    const dates = dateRangeInclusive(from, to);
    if (users.length * dates.length > MAX_MATRIX_CELLS) {
      throw new BadRequestException('Date range too wide for the selected scope — narrow the filters');
    }
    const userIds = users.map((u) => u.id);

    const [settings, holidays, leaves, logs] = await Promise.all([
      this.settingsService.get(),
      this.settingsService.listHolidays(from, to),
      this.leavesService.listApprovedInRange(from, to),
      this.prisma.workLog.findMany({ where: { userId: { in: userIds }, date: { gte: from, lte: to } } }),
    ]);

    const activeHolidays = holidays.filter((h) => h.isActive);
    const holidaysByDate = new Map<string, Holiday[]>();
    for (const h of activeHolidays) {
      const bucket = holidaysByDate.get(h.date) ?? [];
      bucket.push(h);
      holidaysByDate.set(h.date, bucket);
    }
    const logByUserDate = new Map(logs.map((l) => [`${l.userId}:${l.date}`, l]));

    let totalExpected = 0;
    let submitted = 0;
    let reviewed = 0;
    let returned = 0;
    let hoursSum = 0;
    let hoursCount = 0;
    const missingCountByUser = new Map<string, number>();

    for (const user of users) {
      let missingForUser = 0;
      for (const date of dates) {
        if (date > today) continue;
        if (!isWorkingDayFor(user, date, settings)) continue;
        const holiday = holidaysByDate.get(date)?.find((h) => holidayAppliesToUser(h, user.department));
        if (holiday) continue;
        const onLeave = leaves.some((l) => l.userId === user.id && l.startDate <= date && l.endDate >= date);
        if (onLeave) continue;

        totalExpected += 1;
        const log = logByUserDate.get(`${user.id}:${date}`);
        if (!log || log.status === WorkLogStatus.draft) {
          missingForUser += 1;
          continue;
        }
        if (log.status === WorkLogStatus.submitted) submitted += 1;
        else if (log.status === WorkLogStatus.reviewed) reviewed += 1;
        else if (log.status === WorkLogStatus.returned) returned += 1;

        if (log.totalHoursWorked != null) {
          hoursSum += Number(log.totalHoursWorked);
          hoursCount += 1;
        }
      }
      if (missingForUser > 0) missingCountByUser.set(user.id, missingForUser);
    }

    const turnedIn = submitted + reviewed + returned;
    const pending = totalExpected - turnedIn;

    const repeatedMissingEmployees = users
      .filter((u) => (missingCountByUser.get(u.id) ?? 0) >= REPEATED_MISSING_THRESHOLD)
      .map((u) => ({ id: u.id, fullName: u.fullName, missingDays: missingCountByUser.get(u.id) ?? 0 }))
      .sort((a, b) => b.missingDays - a.missingDays);

    return {
      period: { from, to },
      totalExpected,
      submitted,
      pending,
      reviewed,
      returned,
      submissionPercentage: totalExpected ? Math.round((turnedIn / totalExpected) * 10000) / 100 : 0,
      averageHours: hoursCount ? Math.round((hoursSum / hoursCount) * 100) / 100 : 0,
      repeatedMissingEmployees,
    };
  }
}
