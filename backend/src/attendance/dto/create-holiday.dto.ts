import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, } from 'class-validator';
import { HolidayType } from '@prisma/client';

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Christmas Day' })
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ enum: HolidayType, default: HolidayType.public_holiday })
  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType;

  @ApiPropertyOptional({ example: 'Celebrated nationwide' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Marks Islamic-calendar-style dates as subject to confirmation' })
  @IsOptional()
  @IsBoolean()
  isTentative?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['Engineering', 'Sales'],
    description: 'Departments this holiday applies to. Omit or leave empty for all departments.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableDepartments?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
