import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientStatus } from '@prisma/client';
import { ClientContactDto } from './client-contact.dto';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  clientName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  niche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aboutText?: string;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOnboarded?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountManagerId?: string;

  @ApiPropertyOptional({ type: [ClientContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientContactDto)
  contacts?: ClientContactDto[];
}
