import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePayrollSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  payslipEnabled?: boolean;
}
