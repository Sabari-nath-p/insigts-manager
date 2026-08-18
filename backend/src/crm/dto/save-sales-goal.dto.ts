import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Matches, Min } from 'class-validator';

export class SaveSalesGoalDto {
  @ApiProperty({ example: '2026-08' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  period: string;

  @ApiProperty({ example: 1000000 })
  @IsNumber()
  @Min(0)
  revenueGoalAmount: number;
}
