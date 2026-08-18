import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FinalizePayrollDto {
  @ApiPropertyOptional({ description: 'Required if the record has unresolved payroll exceptions' })
  @IsOptional()
  @IsString()
  overrideReason?: string;
}
