import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf, } from 'class-validator';
import { KnowledgeResourceStatus, KnowledgeResourceType, KnowledgeVisibility } from '@prisma/client';
import { UserRole } from '@prisma/client';

export class SaveKnowledgeResourceDto {
  @ApiProperty({ example: 'Leave Policy' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Company leave rules and procedures' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'HR' })
  @IsNotEmpty()
  @IsString()
  categoryGroup: string;

  @ApiProperty({ example: 'Leave Policy' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: ['leave', 'hr'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: KnowledgeResourceType, example: KnowledgeResourceType.document })
  @IsEnum(KnowledgeResourceType)
  type: KnowledgeResourceType;

  @ApiPropertyOptional({ enum: KnowledgeResourceStatus, example: KnowledgeResourceStatus.draft })
  @IsOptional()
  @IsEnum(KnowledgeResourceStatus)
  status?: KnowledgeResourceStatus;

  @ApiPropertyOptional({ description: 'Required when type = document (markdown)' })
  @ValidateIf((o) => o.type === KnowledgeResourceType.document)
  @IsNotEmpty()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Required when type = link' })
  @ValidateIf((o) => o.type === KnowledgeResourceType.link)
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  externalUrl?: string;

  @ApiPropertyOptional({ enum: KnowledgeVisibility, example: KnowledgeVisibility.all })
  @IsOptional()
  @IsEnum(KnowledgeVisibility)
  visibility?: KnowledgeVisibility;

  @ApiPropertyOptional({ example: ['Engineering'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDepartments?: string[];

  @ApiPropertyOptional({ enum: UserRole, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  allowedRoles?: UserRole[];
}
