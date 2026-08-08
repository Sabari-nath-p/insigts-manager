import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';
import { LeaveType } from '../leave-request.entity';

export class ApplyLeaveDto {
  @ApiProperty({ enum: LeaveType, example: LeaveType.PAID })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-22' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'Family function' })
  @IsNotEmpty()
  reason: string;
}
