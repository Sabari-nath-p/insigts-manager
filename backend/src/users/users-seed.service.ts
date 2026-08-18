import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PresenceStatus, UserRole, WorkingType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const SALT_ROUNDS = 10;

/**
 * Bootstraps the very first super admin account from environment variables. Super admins
 * created afterwards go through the normal POST /users flow (by an existing super admin),
 * so this only ever needs to run once — it no-ops if any super admin already exists.
 */
@Injectable()
export class UsersSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const existing = await this.prisma.user.findFirst({ where: { role: UserRole.super_admin } });
    if (existing) return;

    const email = this.configService.get<string>('superAdmin.email');
    const password = this.configService.get<string>('superAdmin.password');
    const fullName = this.configService.get<string>('superAdmin.fullName');
    const phone = this.configService.get<string>('superAdmin.phone');

    if (!email || !password) {
      this.logger.warn(
        'No super admin exists yet and SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD are not set — skipping bootstrap.',
      );
      return;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.user.create({
      data: {
        fullName: fullName || 'Super Admin',
        email,
        password: hashed,
        phone: phone || '0000000000',
        role: UserRole.super_admin,
        workingType: WorkingType.fixed,
        fixedHoursPerDay: 8,
        fixedStartTime: '09:00',
        fixedEndTime: '17:00',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        currentSalary: '0',
        paidLeaveQuota: 12,
        medicalLeaveQuota: 12,
        currentStatus: PresenceStatus.offline,
      },
    });
    this.logger.log(`Bootstrapped initial super admin account: ${email}`);
  }
}
