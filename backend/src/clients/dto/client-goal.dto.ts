import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ClientGoalStatus } from '@prisma/client';

export class SaveClientGoalDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  target: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  current?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: ClientGoalStatus })
  @IsOptional()
  @IsEnum(ClientGoalStatus)
  status?: ClientGoalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
