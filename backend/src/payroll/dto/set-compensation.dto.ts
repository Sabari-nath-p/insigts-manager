import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PayrollEmployeeStatus } from '@prisma/client';

export class SetCompensationDto {
  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  monthlySalary: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(0.5)
  standardWorkingHoursPerDay: number;

  @ApiPropertyOptional({ enum: PayrollEmployeeStatus, default: PayrollEmployeeStatus.active })
  @IsOptional()
  @IsEnum(PayrollEmployeeStatus)
  payrollStatus?: PayrollEmployeeStatus;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: 'Annual increment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
