import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum LeaveDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewLeaveDto {
  @ApiProperty({
    enum: LeaveDecision,
    example: LeaveDecision.APPROVE,
    description:
      'approve sanctions the leave as requested. reject converts paid/medical requests to ' +
      'unpaid leave automatically; an already-unpaid request is simply marked rejected.',
  })
  @IsEnum(LeaveDecision)
  decision: LeaveDecision;

  @ApiPropertyOptional({ example: 'Approved, enjoy your time off' })
  @IsOptional()
  @IsString()
  note?: string;
}
