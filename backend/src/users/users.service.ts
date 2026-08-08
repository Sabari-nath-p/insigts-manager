import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PresenceStatus, User, WorkingType } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { LeavesService } from '../leaves/leaves.service';

const SALT_ROUNDS = 10;

function firstDayOfCurrentMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly attendanceService: AttendanceService,
    private readonly leavesService: LeavesService,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: [
        'id',
        'fullName',
        'email',
        'password',
        'role',
        'isActive',
      ],
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
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.usersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hashed,
      phone: dto.phone,
      role: dto.role,
      workingType: dto.workingType,
      fixedHoursPerDay: dto.workingType === WorkingType.FIXED ? dto.fixedHoursPerDay ?? null : null,
      fixedStartTime: dto.workingType === WorkingType.FIXED ? dto.fixedStartTime ?? null : null,
      fixedEndTime: dto.workingType === WorkingType.FIXED ? dto.fixedEndTime ?? null : null,
      workingDays: dto.workingType === WorkingType.FIXED ? dto.workingDays ?? null : null,
      flexibleMonthlyHours:
        dto.workingType === WorkingType.FLEXIBLE ? dto.flexibleMonthlyHours ?? null : null,
      currentSalary: dto.currentSalary.toString(),
      paidLeaveQuota: dto.paidLeaveQuota ?? 12,
      medicalLeaveQuota: dto.medicalLeaveQuota ?? 12,
    });
    return this.usersRepository.save(user);
  }

  async updateStatus(userId: string, status: PresenceStatus): Promise<User> {
    const user = await this.findByIdOrFail(userId);
    user.currentStatus = status;
    return this.usersRepository.save(user);
  }

  async listTeamStatus(): Promise<Pick<User, 'id' | 'fullName' | 'role' | 'currentStatus'>[]> {
    const users = await this.usersRepository.find({
      where: { isActive: true },
      select: ['id', 'fullName', 'role', 'currentStatus'],
      order: { fullName: 'ASC' },
    });
    return users;
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

    if (user.workingType === WorkingType.FIXED) {
      const days = new Set(user.workingDays ?? []);
      const dayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      let workingDayCount = 0;
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const code = dayCodes[d.getUTCDay()];
        if (days.has(code as any)) workingDayCount += 1;
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
