import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum WorkLogReviewDecision {
  REVIEWED = 'reviewed',
  RETURNED = 'returned',
}

export class ReviewWorkLogDto {
  @ApiProperty({
    enum: WorkLogReviewDecision,
    example: WorkLogReviewDecision.REVIEWED,
    description: 'reviewed accepts the log as final. returned sends it back to the employee for edits.',
  })
  @IsEnum(WorkLogReviewDecision)
  decision: WorkLogReviewDecision;

  @ApiPropertyOptional({ example: 'Please add the client call you mentioned standup' })
  @IsOptional()
  @IsString()
  comment?: string;
}
