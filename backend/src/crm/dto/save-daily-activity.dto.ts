import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SaveDailyActivityDto {
  @ApiProperty({ example: '2026-08-17' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(0)
  dials: number;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(0)
  dmsSent: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(0)
  conversations: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
