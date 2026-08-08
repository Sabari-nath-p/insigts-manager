import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeaveType {
  PAID = 'paid',
  MEDICAL = 'medical',
  UNPAID = 'unpaid',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: LeaveType })
  type: LeaveType;

  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'int' })
  days: number;

  @Column({ type: 'text' })
  reason: string;

  @Column('uuid', { nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
