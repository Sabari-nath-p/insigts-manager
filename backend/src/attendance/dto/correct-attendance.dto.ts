import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

/**
 * Admin correction payload. Only raw, directly-observed facts are editable — worked
 * hours, late/early durations and overtime are always recalculated server-side from
 * these values, never accepted as manual input.
 */
export class CorrectAttendanceDto {
  @ApiPropertyOptional({ example: '2026-08-10' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: '2026-08-10T09:48:00' })
  @IsOptional()
  @IsDateString()
  checkInAt?: string | null;

  @ApiPropertyOptional({ example: '2026-08-10T18:40:00' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string | null;

  @ApiPropertyOptional({ example: 45, description: 'Total break minutes for the day' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalBreakMinutes?: number;
}
