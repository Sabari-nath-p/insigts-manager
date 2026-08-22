import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';
import { LeadStatus, MeetingStatus, SaleType, LossReason } from '@prisma/client';

// These three fields are real instants (a specific moment, not a calendar date), so unlike a
// plain `@IsDateString()` — which also accepts an offset-less "local time" string — they must
// carry an explicit UTC/offset suffix. Without this, a client that skips the browser-local
// datetime-local -> `.toISOString()` conversion could silently send a timezone-less string that
// the server would then parse in its own (not the caller's) timezone.
const REQUIRE_UTC_OFFSET = {
  message: 'must be a full ISO 8601 datetime with an explicit UTC offset (e.g. end with Z)',
};
const HAS_UTC_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

export class UpdateLeadDto extends PartialType(OmitType(CreateLeadDto, ['skipDuplicateCheck'])) {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  // --- Dates ---
  @ApiPropertyOptional({ description: 'Marks first contact now if omitted a value but this field is set true' })
  @IsOptional()
  @IsDateString()
  @Matches(HAS_UTC_OFFSET, REQUIRE_UTC_OFFSET)
  firstContactAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @Matches(HAS_UTC_OFFSET, REQUIRE_UTC_OFFSET)
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
  @Matches(HAS_UTC_OFFSET, REQUIRE_UTC_OFFSET)
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
