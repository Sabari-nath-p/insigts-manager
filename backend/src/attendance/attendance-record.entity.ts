import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('attendance_records')
@Index(['userId', 'date'], { unique: true })
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'date' })
  date: string; // "YYYY-MM-DD", one record per user per calendar day

  @Column({ type: 'datetime', nullable: true })
  checkInAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  checkOutAt: Date | null;

  @Column({ type: 'int', nullable: true })
  workedMinutes: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
