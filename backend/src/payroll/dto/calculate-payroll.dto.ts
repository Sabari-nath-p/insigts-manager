import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class CalculatePayrollDto {
  @ApiProperty({ example: '2026-08', description: 'YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month: string;

  @ApiPropertyOptional({ type: [String], description: 'Omit to calculate for every eligible active employee' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
