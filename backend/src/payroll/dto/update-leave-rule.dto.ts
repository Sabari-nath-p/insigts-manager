import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateLeaveRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPayable?: boolean;

  @ApiPropertyOptional({ example: 1, description: '0..1 — fraction of a standard day paid for this leave type' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  payableFraction?: number;
}
