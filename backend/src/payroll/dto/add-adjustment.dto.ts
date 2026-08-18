import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PayrollAdjustmentType } from '@prisma/client';

export class AddAdjustmentDto {
  @ApiProperty({ enum: PayrollAdjustmentType })
  @IsEnum(PayrollAdjustmentType)
  type: PayrollAdjustmentType;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Diwali bonus' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEmployeeVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
