import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientServiceStatus } from '@prisma/client';

export class ServiceDeliverableDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  target: number;

  @IsNumber()
  @Min(0)
  completed: number;
}

export class SaveClientServiceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ enum: ClientServiceStatus })
  @IsOptional()
  @IsEnum(ClientServiceStatus)
  status?: ClientServiceStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  assignedUserIds?: string[];

  @ApiPropertyOptional({ type: [ServiceDeliverableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDeliverableDto)
  deliverables?: ServiceDeliverableDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
