import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequest, LeaveStatus, LeaveType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { LeaveDecision, ReviewLeaveDto } from './dto/review-leave.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return days;
}

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: ApplyLeaveDto): Promise<LeaveRequest> {
    const days = inclusiveDayCount(dto.startDate, dto.endDate);
    if (days <= 0) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    return this.prisma.leaveRequest.create({
      data: {
        userId,
        type: dto.type,
        status: LeaveStatus.pending,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days,
        reason: dto.reason,
      },
    });
  }

  listForUser(userId: string): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  listAll(status?: LeaveStatus): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(reviewerId: string, leaveId: string, dto: ReviewLeaveDto): Promise<LeaveRequest> {
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== LeaveStatus.pending) {
      throw new BadRequestException('This leave request has already been reviewed');
    }

    let status: LeaveStatus;
    let type = leave.type;
    if (dto.decision === LeaveDecision.APPROVE) {
      status = LeaveStatus.approved;
    } else if (leave.type === LeaveType.unpaid) {
      // An unpaid request has nowhere further to fall back to — a rejection is final.
      status = LeaveStatus.rejected;
    } else {
      // Paid/medical leave that isn't sanctioned is not denied outright: it is
      // auto-converted to unpaid leave and sanctioned as such.
      type = LeaveType.unpaid;
      status = LeaveStatus.approved;
    }

    return this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status, type, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: dto.note ?? null },
    });
  }

  /** True iff any leave request (regardless of status) already spans this date. */
  async hasLeaveCoveringDate(userId: string, date: string): Promise<boolean> {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { userId, startDate: { lte: date }, endDate: { gte: date } },
    });
    return !!leave;
  }

  /** Approved leaves for one user that overlap the inclusive [from, to] range. */
  listApprovedForUserInRange(userId: string, from: string, to: string): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({
      where: { userId, status: LeaveStatus.approved, startDate: { lte: to }, endDate: { gte: from } },
    });
  }

  /** Approved leaves (any user) that overlap the inclusive [from, to] range. */
  listApprovedInRange(from: string, to: string): Promise<LeaveRequest[]> {
    return this.prisma.leaveRequest.findMany({
      where: { status: LeaveStatus.approved, startDate: { lte: to }, endDate: { gte: from } },
    });
  }

  /** Creates an auto-approved unpaid leave for a single day, used by the nightly auto-leave job. */
  createSystemLeave(userId: string, date: string, reason: string): Promise<LeaveRequest> {
    return this.prisma.leaveRequest.create({
      data: {
        userId,
        type: LeaveType.unpaid,
        status: LeaveStatus.approved,
        startDate: date,
        endDate: date,
        days: 1,
        reason,
        isSystemGenerated: true,
        reviewedBy: null,
        reviewedAt: null,
      },
    });
  }

  /** Approved leave days for a user within an inclusive date range, grouped by final type. */
  async takenSummary(
    userId: string,
    from: string,
    to: string,
  ): Promise<{ paidDays: number; medicalDays: number; unpaidDays: number; totalDays: number }> {
    const leaves = await this.prisma.leaveRequest.findMany({
      where: { userId, status: LeaveStatus.approved, startDate: { gte: from, lte: to } },
    });
    const summary = { paidDays: 0, medicalDays: 0, unpaidDays: 0, totalDays: 0 };
    for (const leave of leaves) {
      summary.totalDays += leave.days;
      if (leave.type === LeaveType.paid) summary.paidDays += leave.days;
      else if (leave.type === LeaveType.medical) summary.medicalDays += leave.days;
      else summary.unpaidDays += leave.days;
    }
    return summary;
  }
}
