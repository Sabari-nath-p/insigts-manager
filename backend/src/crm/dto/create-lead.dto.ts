import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: 'Jordan Lee' })
  @IsNotEmpty()
  @IsString()
  leadName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadSourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  setterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  closerId?: string;

  @ApiPropertyOptional({ description: 'Skip the duplicate-lead check and create anyway' })
  @IsOptional()
  @IsBoolean()
  skipDuplicateCheck?: boolean;
}
