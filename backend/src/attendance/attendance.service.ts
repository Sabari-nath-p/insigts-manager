import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
  ) {}

  async checkIn(userId: string): Promise<AttendanceRecord> {
    const date = todayDateString();
    let record = await this.attendanceRepository.findOne({ where: { userId, date } });

    if (record?.checkInAt && !record.checkOutAt) {
      throw new ConflictException('Already checked in today');
    }
    if (record?.checkOutAt) {
      throw new ConflictException('Attendance for today is already complete');
    }

    if (!record) {
      record = this.attendanceRepository.create({ userId, date });
    }
    record.checkInAt = new Date();
    return this.attendanceRepository.save(record);
  }

  async checkOut(userId: string): Promise<AttendanceRecord> {
    const date = todayDateString();
    const record = await this.attendanceRepository.findOne({ where: { userId, date } });

    if (!record || !record.checkInAt) {
      throw new BadRequestException('You must check in before checking out');
    }
    if (record.checkOutAt) {
      throw new ConflictException('Already checked out today');
    }

    const checkOutAt = new Date();
    record.checkOutAt = checkOutAt;
    record.workedMinutes = Math.round(
      (checkOutAt.getTime() - new Date(record.checkInAt).getTime()) / 60000,
    );
    return this.attendanceRepository.save(record);
  }

  getToday(userId: string): Promise<AttendanceRecord | null> {
    return this.attendanceRepository.findOne({ where: { userId, date: todayDateString() } });
  }

  listForUser(userId: string, from?: string, to?: string): Promise<AttendanceRecord[]> {
    const where: any = { userId };
    if (from && to) {
      where.date = Between(from, to);
    }
    return this.attendanceRepository.find({ where, order: { date: 'DESC' } });
  }

  /** Sum of worked minutes for a user within an inclusive date range. */
  async totalWorkedMinutes(userId: string, from: string, to: string): Promise<number> {
    const records = await this.attendanceRepository.find({
      where: { userId, date: Between(from, to) },
    });
    return records.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
  }

  /** Days within the range that have a completed check-in + check-out. */
  countWorkedDays(userId: string, from: string, to: string): Promise<number> {
    return this.attendanceRepository.count({
      where: { userId, date: Between(from, to), checkOutAt: Not(IsNull()) },
    });
  }
}
