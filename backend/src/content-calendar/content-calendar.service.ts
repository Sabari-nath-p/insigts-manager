import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarDay, CalendarDays, cleanDay, daysBeyondMonth, daysInMonth, withDay } from './calendar-days';
import { CreateCalendarDto, SaveDayDto, UpdateCalendarDto } from './dto/content-calendar.dto';

export type CalendarUser = { userId: string; role: UserRole };

const monthName = (m: number) => new Date(2000, m, 1).toLocaleString('en', { month: 'long' });

/**
 * Content calendars. Anyone logged in may view. Editing needs a row in content_calendar_editors
 * (the social media team) or the super_admin role. Only super admins decide who is an editor.
 * Reads `users`; writes only the two content_calendar* tables.
 */
@Injectable()
export class ContentCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private async canEdit(user: CalendarUser): Promise<boolean> {
    if (user.role === UserRole.super_admin) return true;
    return !!(await this.prisma.contentCalendarEditor.findUnique({ where: { userId: user.userId } }));
  }

  private async assertCanEdit(user: CalendarUser) {
    if (!(await this.canEdit(user))) throw new ForbiddenException('You do not have edit access to the content calendar.');
  }

  async me(user: CalendarUser) {
    return { canEdit: await this.canEdit(user), canManage: user.role === UserRole.super_admin };
  }

  private shape(c: { id: string; client: string; year: number; month: number; days: Prisma.JsonValue }) {
    return { id: c.id, client: c.client, year: c.year, month: c.month, days: (c.days ?? {}) as unknown as CalendarDays };
  }

  async list() {
    const rows = await this.prisma.contentCalendar.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }, { client: 'asc' }] });
    return rows.map((r) => this.shape(r));
  }

  private async assertFree(clientKey: string, year: number, month: number, exceptId?: string) {
    const dup = await this.prisma.contentCalendar.findUnique({ where: { clientKey_year_month: { clientKey, year, month } } });
    if (dup && dup.id !== exceptId) throw new ConflictException(`${dup.client} already has a ${monthName(month)} ${year} calendar.`);
  }

  async create(user: CalendarUser, dto: CreateCalendarDto) {
    await this.assertCanEdit(user);
    const client = dto.client.trim();
    if (!client) throw new BadRequestException('Enter the client name.');
    const clientKey = client.toLowerCase();
    await this.assertFree(clientKey, dto.year, dto.month);
    try {
      const row = await this.prisma.contentCalendar.create({
        data: { client, clientKey, year: dto.year, month: dto.month, days: {}, createdBy: user.userId },
      });
      return this.shape(row);
    } catch (e) {
      // Two people adding the same month at once: the unique index decides.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(`${client} already has a ${monthName(dto.month)} ${dto.year} calendar.`);
      throw e;
    }
  }

  async update(user: CalendarUser, id: string, dto: UpdateCalendarDto) {
    await this.assertCanEdit(user);
    const existing = await this.prisma.contentCalendar.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Calendar not found.');

    const client = dto.client?.trim() || existing.client;
    const year = dto.year ?? existing.year;
    const month = dto.month ?? existing.month;
    await this.assertFree(client.toLowerCase(), year, month, id);

    const stranded = daysBeyondMonth((existing.days ?? {}) as unknown as CalendarDays, year, month);
    if (stranded.length) {
      throw new ConflictException(`${monthName(month)} ${year} has no day ${stranded.join(', ')}. Clear ${stranded.length === 1 ? 'that day' : 'those days'} first.`);
    }

    try {
      const row = await this.prisma.contentCalendar.update({ where: { id }, data: { client, clientKey: client.toLowerCase(), year, month } });
      return this.shape(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(`${client} already has a ${monthName(month)} ${year} calendar.`);
      throw e;
    }
  }

  async remove(user: CalendarUser, id: string) {
    await this.assertCanEdit(user);
    const { count } = await this.prisma.contentCalendar.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException('Calendar not found.');
  }

  /**
   * Replaces one day. The calendar row is locked while the day is merged in, so two people saving
   * different days of the same month at the same moment both keep their changes.
   */
  async saveDay(user: CalendarUser, id: string, day: number, dto: SaveDayDto) {
    await this.assertCanEdit(user);
    const next: CalendarDay = cleanDay(dto);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM content_calendars WHERE id = ${id} FOR UPDATE`;
      const row = await tx.contentCalendar.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Calendar not found.');
      if (day < 1 || day > daysInMonth(row.year, row.month)) throw new BadRequestException(`${monthName(row.month)} ${row.year} has no day ${day}.`);
      const days = withDay((row.days ?? {}) as unknown as CalendarDays, day, next);
      await tx.contentCalendar.update({ where: { id }, data: { days: days as unknown as Prisma.InputJsonValue } });
    });
  }

  // --- who can edit (super admins only; the controller enforces that) ---

  async listAccess() {
    const [users, editors] = await Promise.all([
      this.prisma.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true, email: true, role: true }, orderBy: { fullName: 'asc' } }),
      this.prisma.contentCalendarEditor.findMany({ select: { userId: true } }),
    ]);
    const ticked = new Set(editors.map((e) => e.userId));
    return users.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, canEdit: u.role === UserRole.super_admin || ticked.has(u.id) }));
  }

  async setEditor(userId: string, canEdit: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('Person not found.');
    // Super admins can always edit; there is nothing to store for them.
    if (user.role === UserRole.super_admin) return;
    if (canEdit) await this.prisma.contentCalendarEditor.upsert({ where: { userId }, create: { userId }, update: {} });
    else await this.prisma.contentCalendarEditor.deleteMany({ where: { userId } });
  }
}
