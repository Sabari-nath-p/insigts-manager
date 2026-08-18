import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceSettings, Holiday, HolidayType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAttendanceSettingsDto } from './dto/update-attendance-settings.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { DEFAULT_HOLIDAYS } from './default-holidays';
import { holidaysToCsv, parseHolidaysCsv } from './holiday-csv';

const SETTINGS_ID = 1;
const HOLIDAY_TYPES = Object.values(HolidayType) as string[];

@Injectable()
export class AttendanceSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<AttendanceSettings> {
    let settings = await this.prisma.attendanceSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!settings) {
      settings = await this.prisma.attendanceSettings.create({
        data: {
          id: SETTINGS_ID,
          workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
          weeklyOffDays: ['SUN'],
        },
      });
    }
    return settings;
  }

  async update(dto: UpdateAttendanceSettingsDto): Promise<AttendanceSettings> {
    await this.get();
    return this.prisma.attendanceSettings.update({
      where: { id: SETTINGS_ID },
      data: dto as Prisma.AttendanceSettingsUpdateInput,
    });
  }

  listHolidays(from?: string, to?: string): Promise<Holiday[]> {
    return this.prisma.holiday.findMany({
      where: from && to ? { date: { gte: from, lte: to } } : {},
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(dto: CreateHolidayDto): Promise<Holiday> {
    const existing = await this.prisma.holiday.findUnique({ where: { date: dto.date } });
    if (existing) {
      throw new ConflictException('A holiday is already recorded for this date');
    }
    return this.prisma.holiday.create({ data: dto as Prisma.HolidayCreateInput });
  }

  async updateHoliday(id: string, dto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }
    if (dto.date && dto.date !== holiday.date) {
      const clash = await this.prisma.holiday.findUnique({ where: { date: dto.date } });
      if (clash) {
        throw new ConflictException('A holiday is already recorded for this date');
      }
    }
    return this.prisma.holiday.update({ where: { id }, data: dto as Prisma.HolidayUpdateInput });
  }

  async deleteHoliday(id: string): Promise<void> {
    try {
      await this.prisma.holiday.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Holiday not found');
    }
  }

  /** Copies every holiday whose date falls in sourceYear onto the same month/day in targetYear. */
  async duplicateHolidays(sourceYear: number, targetYear: number): Promise<{ created: Holiday[]; skipped: number }> {
    const source = await this.prisma.holiday.findMany({
      where: { date: { gte: `${sourceYear}-01-01`, lte: `${sourceYear}-12-31` } },
      orderBy: { date: 'asc' },
    });

    const created: Holiday[] = [];
    let skipped = 0;
    for (const holiday of source) {
      const targetDate = holiday.date.replace(String(sourceYear), String(targetYear));
      const exists = await this.prisma.holiday.findUnique({ where: { date: targetDate } });
      if (exists) {
        skipped += 1;
        continue;
      }
      const copy = await this.prisma.holiday.create({
        data: {
          date: targetDate,
          name: holiday.name,
          type: holiday.type,
          description: holiday.description,
          isPaid: holiday.isPaid,
          isOptional: holiday.isOptional,
          isTentative: holiday.isTentative,
          applicableDepartments: holiday.applicableDepartments as Prisma.InputJsonValue,
          isActive: holiday.isActive,
        },
      });
      created.push(copy);
    }
    return { created, skipped };
  }

  async exportHolidaysCsv(from?: string, to?: string): Promise<string> {
    const holidays = await this.listHolidays(from, to);
    return holidaysToCsv(holidays);
  }

  async importHolidaysCsv(csv: string): Promise<{ created: number; skipped: number; errors: string[] }> {
    const rows = parseHolidaysCsv(csv);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      const rowLabel = `Row ${index + 1} (${row.date || 'no date'})`;
      if (!row.date || Number.isNaN(Date.parse(row.date))) {
        errors.push(`${rowLabel}: invalid or missing date`);
        continue;
      }
      if (!row.name) {
        errors.push(`${rowLabel}: missing name`);
        continue;
      }
      const type = HOLIDAY_TYPES.includes(row.type) ? (row.type as HolidayType) : HolidayType.public_holiday;

      const existing = await this.prisma.holiday.findUnique({ where: { date: row.date } });
      if (existing) {
        skipped += 1;
        continue;
      }

      await this.prisma.holiday.create({
        data: {
          date: row.date,
          name: row.name,
          type,
          description: row.description || null,
          isPaid: row.isPaid,
          isOptional: row.isOptional,
          isTentative: row.isTentative,
          applicableDepartments: row.applicableDepartments.length ? row.applicableDepartments : Prisma.JsonNull,
          isActive: row.isActive,
        },
      });
      created += 1;
    }

    if (!rows.length) {
      throw new BadRequestException('No holiday rows found in the uploaded CSV');
    }

    return { created, skipped, errors };
  }

  /** Re-inserts the standard holiday calendar, skipping any date that already has a holiday. */
  async restoreDefaultHolidays(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (const defaultHoliday of DEFAULT_HOLIDAYS) {
      const existing = await this.prisma.holiday.findUnique({ where: { date: defaultHoliday.date } });
      if (existing) {
        skipped += 1;
        continue;
      }
      await this.prisma.holiday.create({
        data: {
          date: defaultHoliday.date,
          name: defaultHoliday.name,
          type: defaultHoliday.type,
          isTentative: defaultHoliday.isTentative ?? false,
        },
      });
      created += 1;
    }
    return { created, skipped };
  }
}
