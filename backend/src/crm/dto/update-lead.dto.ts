import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';
import { LeadStatus, MeetingStatus, SaleType, LossReason } from '@prisma/client';

export class UpdateLeadDto extends PartialType(OmitType(CreateLeadDto, ['skipDuplicateCheck'])) {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  // --- Dates ---
  @ApiPropertyOptional({ description: 'Marks first contact now if omitted a value but this field is set true' })
  @IsOptional()
  @IsDateString()
  firstContactAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  meetingBookedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  meetingDate?: string;

  @ApiPropertyOptional({ example: '14:30' })
  @IsOptional()
  @IsString()
  meetingTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastTouchAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  depositPaidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidInFullAt?: string;

  // --- Meeting management ---
  @ApiPropertyOptional({ enum: MeetingStatus })
  @IsOptional()
  @IsEnum(MeetingStatus)
  meetingStatus?: MeetingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  rescheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dqReason?: string;

  // --- Call outcome ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  offerMade?: boolean;

  @ApiPropertyOptional({ enum: SaleType })
  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

  // --- Loss ---
  @ApiPropertyOptional({ enum: LossReason })
  @IsOptional()
  @IsEnum(LossReason)
  lossReason?: LossReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lossNotes?: string;

  // --- Money ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dealValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashCollected?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({ description: 'Per-deal commission override — every change is audit logged' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionOverridePercent?: number;

  // --- Follow-up ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followUpNotes?: string;

  @ApiPropertyOptional({ description: 'super_admin only — reassignment is otherwise done via the /assign endpoint' })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
