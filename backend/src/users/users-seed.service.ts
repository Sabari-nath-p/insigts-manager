import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PresenceStatus, User, UserRole, WorkingType } from './user.entity';

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
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const existing = await this.usersRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });
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
    const admin = this.usersRepository.create({
      fullName: fullName || 'Super Admin',
      email,
      password: hashed,
      phone: phone || '0000000000',
      role: UserRole.SUPER_ADMIN,
      workingType: WorkingType.FIXED,
      fixedHoursPerDay: 8,
      fixedStartTime: '09:00',
      fixedEndTime: '17:00',
      workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as any,
      currentSalary: '0',
      paidLeaveQuota: 12,
      medicalLeaveQuota: 12,
      currentStatus: PresenceStatus.OFFLINE,
    });
    await this.usersRepository.save(admin);
    this.logger.log(`Bootstrapped initial super admin account: ${email}`);
  }
}
