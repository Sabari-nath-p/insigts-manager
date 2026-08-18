import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class ApplyLeaveDto {
  @ApiProperty({ enum: LeaveType, example: LeaveType.paid })
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
