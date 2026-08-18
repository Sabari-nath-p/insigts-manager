import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveWorkLogDto {
  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '- Fixed login bug\n- Reviewed PR #42' })
  @IsNotEmpty()
  @IsString()
  tasksCompleted: string;

  @ApiPropertyOptional({ example: 'Waiting on API access from DevOps' })
  @IsOptional()
  @IsString()
  blockers?: string;

  @ApiPropertyOptional({ example: 7.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  totalHoursWorked?: number;

  @ApiPropertyOptional({ example: 'Sprint planning: agreed to ship v2 by Friday' })
  @IsOptional()
  @IsString()
  meetingSummary?: string;
}
