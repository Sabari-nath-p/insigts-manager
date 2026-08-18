import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole, WorkingType, PresenceStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { LeavesService } from '../leaves/leaves.service';
import { zonedDateString } from '../attendance/attendance-calculations';

const SALT_ROUNDS = 10;

type AuthUser = Pick<User, 'id' | 'fullName' | 'email' | 'password' | 'role' | 'isActive'>;

/** First day of the current month in APP_TIMEZONE — not the server process's local date or UTC. */
function firstDayOfCurrentMonth(): string {
  return `${zonedDateString().slice(0, 7)}-01`;
}

/** "Today" in the company's operating timezone (APP_TIMEZONE) — not the server process's local date or UTC. */
function todayDateString(): string {
  return zonedDateString();
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly leavesService: LeavesService,
  ) {}

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true, password: true, role: true, isActive: true },
    });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: hashed,
        phone: dto.phone,
        role: dto.role,
        workingType: dto.workingType,
        designation: dto.designation ?? null,
        department: dto.department ?? null,
        joiningDate: dto.joiningDate ?? null,
        managerId: dto.managerId ?? null,
        fixedHoursPerDay: dto.workingType === WorkingType.fixed ? dto.fixedHoursPerDay ?? null : null,
        fixedStartTime: dto.workingType === WorkingType.fixed ? dto.fixedStartTime ?? null : null,
        fixedEndTime: dto.workingType === WorkingType.fixed ? dto.fixedEndTime ?? null : null,
        workingDays: (dto.workingType === WorkingType.fixed ? dto.workingDays ?? null : null) as Prisma.InputJsonValue,
        flexibleMonthlyHours: dto.workingType === WorkingType.flexible ? dto.flexibleMonthlyHours ?? null : null,
        currentSalary: dto.currentSalary.toString(),
        paidLeaveQuota: dto.paidLeaveQuota ?? 12,
        medicalLeaveQuota: dto.medicalLeaveQuota ?? 12,
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findByIdOrFail(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Email is already in use');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.designation !== undefined) data.designation = dto.designation ?? null;
    if (dto.department !== undefined) data.department = dto.department ?? null;
    if (dto.joiningDate !== undefined) data.joiningDate = dto.joiningDate ?? null;
    if (dto.managerId !== undefined) data.managerId = dto.managerId ?? null;
    if (dto.currentSalary !== undefined) data.currentSalary = dto.currentSalary.toString();
    if (dto.paidLeaveQuota !== undefined) data.paidLeaveQuota = dto.paidLeaveQuota;
    if (dto.medicalLeaveQuota !== undefined) data.medicalLeaveQuota = dto.medicalLeaveQuota;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // Working-type-conditional fields are only touched when a new workingType is actually
    // submitted, same shape as createUser — otherwise a partial edit (e.g. just phone) would
    // wipe out an untouched employee's existing schedule.
    if (dto.workingType !== undefined) {
      data.workingType = dto.workingType;
      if (dto.workingType === WorkingType.fixed) {
        data.fixedHoursPerDay = dto.fixedHoursPerDay ?? user.fixedHoursPerDay ?? null;
        data.fixedStartTime = dto.fixedStartTime ?? user.fixedStartTime ?? null;
        data.fixedEndTime = dto.fixedEndTime ?? user.fixedEndTime ?? null;
        data.workingDays = (dto.workingDays ?? (user.workingDays as string[] | null) ?? null) as Prisma.InputJsonValue;
        data.flexibleMonthlyHours = null;
      } else {
        data.flexibleMonthlyHours = dto.flexibleMonthlyHours ?? user.flexibleMonthlyHours ?? null;
        data.fixedHoursPerDay = null;
        data.fixedStartTime = null;
        data.fixedEndTime = null;
        data.workingDays = Prisma.JsonNull;
      }
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  async setActive(id: string, isActive: boolean): Promise<User> {
    await this.findByIdOrFail(id);
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  async updateStatus(userId: string, status: PresenceStatus): Promise<User> {
    await this.findByIdOrFail(userId);
    return this.prisma.user.update({ where: { id: userId }, data: { currentStatus: status } });
  }

  /** Users eligible to be someone's manager (manager or super admin), for the "Reports to" picker. */
  listManagers(): Promise<Pick<User, 'id' | 'fullName' | 'role'>[]> {
    return this.prisma.user.findMany({
      where: { role: { in: [UserRole.manager, UserRole.super_admin] }, isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    });
  }

  listTeamStatus(): Promise<Pick<User, 'id' | 'fullName' | 'role' | 'currentStatus'>[]> {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, currentStatus: true },
      orderBy: { fullName: 'asc' },
    });
  }

  /**
   * Expected working hours for a user over an inclusive date range, based on their
   * working type. Fixed workers are expected to work fixedHoursPerDay on each of their
   * configured working days that falls within the range; flexible workers have a flat
   * monthly target, prorated by the number of days requested vs. days in that month.
   */
  private expectedHours(user: User, from: string, to: string): number {
    const start = new Date(from);
    const end = new Date(to);

    if (user.workingType === WorkingType.fixed) {
      const days = new Set((user.workingDays as string[] | null) ?? []);
      const dayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      let workingDayCount = 0;
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const code = dayCodes[d.getUTCDay()];
        if (days.has(code)) workingDayCount += 1;
      }
      return workingDayCount * (user.fixedHoursPerDay ?? 0);
    }

    // Flexible: prorate the monthly target by the number of days in the requested range.
    const rangeDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const daysInMonth = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const monthlyTarget = user.flexibleMonthlyHours ?? 0;
    return (monthlyTarget / daysInMonth) * rangeDays;
  }

  async getOverview(userId: string, from?: string, to?: string) {
    const user = await this.findByIdOrFail(userId);
    const rangeFrom = from ?? firstDayOfCurrentMonth();
    const rangeTo = to ?? todayDateString();

    const [workedMinutes, leaveSummary] = await Promise.all([
      this.attendanceService.totalWorkedMinutes(userId, rangeFrom, rangeTo),
      this.leavesService.takenSummary(userId, rangeFrom, rangeTo),
    ]);

    const workedHours = Math.round((workedMinutes / 60) * 100) / 100;
    const expectedHours = Math.round(this.expectedHours(user, rangeFrom, rangeTo) * 100) / 100;
    const notWorkedHours = Math.max(Math.round((expectedHours - workedHours) * 100) / 100, 0);

    return {
      userId,
      period: { from: rangeFrom, to: rangeTo },
      totalWorkedHours: workedHours,
      expectedHours,
      totalWorkHoursNotWorked: notWorkedHours,
      leavesTaken: leaveSummary,
      leaveBalance: {
        paidRemaining: user.paidLeaveQuota - leaveSummary.paidDays,
        medicalRemaining: user.medicalLeaveQuota - leaveSummary.medicalDays,
      },
    };
  }
}
