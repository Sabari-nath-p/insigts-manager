import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { WeekDay } from '../../common/week-day';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateAttendanceSettingsDto {
  @ApiPropertyOptional({ example: '09:30' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'workStartTime must be in HH:mm format' })
  workStartTime?: string;

  @ApiPropertyOptional({ example: '18:30' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'workEndTime must be in HH:mm format' })
  workEndTime?: string;

  @ApiPropertyOptional({ example: 480, description: 'Required working minutes per day' })
  @IsOptional()
  @IsInt()
  @Min(1)
  requiredMinutesPerDay?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateGraceMinutes?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  earlyCheckoutGraceMinutes?: number;

  @ApiPropertyOptional({ enum: WeekDay, isArray: true, example: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] })
  @IsOptional()
  @IsArray()
  @IsEnum(WeekDay, { each: true })
  workingDays?: WeekDay[];

  @ApiPropertyOptional({ enum: WeekDay, isArray: true, example: ['SUN'] })
  @IsOptional()
  @IsArray()
  @IsEnum(WeekDay, { each: true })
  weeklyOffDays?: WeekDay[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  secondSaturdayOff?: boolean;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  breakDurationMinutes?: number;

  @ApiPropertyOptional({ example: 240 })
  @IsOptional()
  @IsInt()
  @Min(0)
  halfDayThresholdMinutes?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeThresholdMinutes?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  flexibleWorkingEnabled?: boolean;
}
