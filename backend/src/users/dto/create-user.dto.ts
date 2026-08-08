import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole, WeekDay, WorkingType } from '../user.entity';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'jane.doe@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '+91 98765 43210' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ enum: WorkingType, example: WorkingType.FIXED })
  @IsEnum(WorkingType)
  workingType: WorkingType;

  @ApiPropertyOptional({ example: 8, description: 'Required when workingType = fixed' })
  @ValidateIf((o) => o.workingType === WorkingType.FIXED)
  @IsNumber()
  @Min(0)
  fixedHoursPerDay?: number;

  @ApiPropertyOptional({ example: '09:00', description: 'Required when workingType = fixed' })
  @ValidateIf((o) => o.workingType === WorkingType.FIXED)
  @Matches(TIME_PATTERN, { message: 'fixedStartTime must be in HH:mm format' })
  fixedStartTime?: string;

  @ApiPropertyOptional({ example: '17:00', description: 'Required when workingType = fixed' })
  @ValidateIf((o) => o.workingType === WorkingType.FIXED)
  @Matches(TIME_PATTERN, { message: 'fixedEndTime must be in HH:mm format' })
  fixedEndTime?: string;

  @ApiPropertyOptional({
    enum: WeekDay,
    isArray: true,
    example: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    description: 'Required when workingType = fixed',
  })
  @ValidateIf((o) => o.workingType === WorkingType.FIXED)
  @IsArray()
  @IsEnum(WeekDay, { each: true })
  workingDays?: WeekDay[];

  @ApiPropertyOptional({ example: 160, description: 'Required when workingType = flexible' })
  @ValidateIf((o) => o.workingType === WorkingType.FLEXIBLE)
  @IsNumber()
  @Min(0)
  flexibleMonthlyHours?: number;

  @ApiProperty({ example: 55000 })
  @IsNumber()
  @Min(0)
  currentSalary: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  paidLeaveQuota?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  medicalLeaveQuota?: number;
}
