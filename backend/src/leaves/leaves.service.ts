import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LeaveRequest, LeaveStatus, LeaveType } from './leave-request.entity';
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
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRepository: Repository<LeaveRequest>,
  ) {}

  async apply(userId: string, dto: ApplyLeaveDto): Promise<LeaveRequest> {
    const days = inclusiveDayCount(dto.startDate, dto.endDate);
    if (days <= 0) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    const leave = this.leaveRepository.create({
      userId,
      type: dto.type,
      status: LeaveStatus.PENDING,
      startDate: dto.startDate,
      endDate: dto.endDate,
      days,
      reason: dto.reason,
    });
    return this.leaveRepository.save(leave);
  }

  listForUser(userId: string): Promise<LeaveRequest[]> {
    return this.leaveRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  listAll(status?: LeaveStatus): Promise<LeaveRequest[]> {
    return this.leaveRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async review(reviewerId: string, leaveId: string, dto: ReviewLeaveDto): Promise<LeaveRequest> {
    const leave = await this.leaveRepository.findOne({ where: { id: leaveId } });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('This leave request has already been reviewed');
    }

    if (dto.decision === LeaveDecision.APPROVE) {
      leave.status = LeaveStatus.APPROVED;
    } else if (leave.type === LeaveType.UNPAID) {
      // An unpaid request has nowhere further to fall back to — a rejection is final.
      leave.status = LeaveStatus.REJECTED;
    } else {
      // Paid/medical leave that isn't sanctioned is not denied outright: it is
      // auto-converted to unpaid leave and sanctioned as such.
      leave.type = LeaveType.UNPAID;
      leave.status = LeaveStatus.APPROVED;
    }

    leave.reviewedBy = reviewerId;
    leave.reviewedAt = new Date();
    leave.reviewNote = dto.note ?? null;
    return this.leaveRepository.save(leave);
  }

  /** Approved leave days for a user within an inclusive date range, grouped by final type. */
  async takenSummary(
    userId: string,
    from: string,
    to: string,
  ): Promise<{ paidDays: number; medicalDays: number; unpaidDays: number; totalDays: number }> {
    const leaves = await this.leaveRepository.find({
      where: { userId, status: LeaveStatus.APPROVED, startDate: Between(from, to) },
    });
    const summary = { paidDays: 0, medicalDays: 0, unpaidDays: 0, totalDays: 0 };
    for (const leave of leaves) {
      summary.totalDays += leave.days;
      if (leave.type === LeaveType.PAID) summary.paidDays += leave.days;
      else if (leave.type === LeaveType.MEDICAL) summary.medicalDays += leave.days;
      else summary.unpaidDays += leave.days;
    }
    return summary;
  }
}
