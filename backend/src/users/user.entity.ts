import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  EMPLOYEE = 'employee',
}

export enum WorkingType {
  FIXED = 'fixed',
  FLEXIBLE = 'flexible',
}

export enum WeekDay {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

export enum PresenceStatus {
  WORKING = 'working',
  IN_MEETING = 'in_meeting',
  ON_BREAK = 'on_break',
  ON_LEAVE = 'on_leave',
  OFFLINE = 'offline',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Exclude()
  @Column({ select: false })
  password: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ type: 'enum', enum: WorkingType, default: WorkingType.FIXED })
  workingType: WorkingType;

  // --- Fixed-schedule fields (only meaningful when workingType = FIXED) ---
  @Column({ type: 'float', nullable: true })
  fixedHoursPerDay: number | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  fixedStartTime: string | null; // "HH:mm"

  @Column({ type: 'varchar', length: 5, nullable: true })
  fixedEndTime: string | null; // "HH:mm"

  @Column({ type: 'simple-array', nullable: true })
  workingDays: WeekDay[] | null; // e.g. ['MON','TUE','WED','THU','FRI','SAT']

  // --- Flexible-schedule fields (only meaningful when workingType = FLEXIBLE) ---
  @Column({ type: 'float', nullable: true })
  flexibleMonthlyHours: number | null;

  // --- Compensation & leave entitlement ---
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentSalary: string;

  @Column({ type: 'int', default: 12 })
  paidLeaveQuota: number;

  @Column({ type: 'int', default: 12 })
  medicalLeaveQuota: number;

  // --- Live presence, set by the user themselves ---
  @Column({ type: 'enum', enum: PresenceStatus, default: PresenceStatus.OFFLINE })
  currentStatus: PresenceStatus;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
