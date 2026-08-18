import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KnowledgeResourceStatus, KnowledgeVisibility } from '@prisma/client';

/**
 * Multipart form fields arrive as plain strings (multer doesn't JSON-parse them), so
 * array fields here are comma-separated and split in KnowledgeBaseService.parseCsv().
 */
export class UploadKnowledgeResourceDto {
  @ApiProperty({ example: 'Employee Handbook' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'HR' })
  @IsString()
  categoryGroup: string;

  @ApiProperty({ example: 'HR Policies' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'handbook,hr' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ enum: KnowledgeResourceStatus })
  @IsOptional()
  @IsEnum(KnowledgeResourceStatus)
  status?: KnowledgeResourceStatus;

  @ApiPropertyOptional({ enum: KnowledgeVisibility })
  @IsOptional()
  @IsEnum(KnowledgeVisibility)
  visibility?: KnowledgeVisibility;

  @ApiPropertyOptional({ example: 'Engineering,Sales' })
  @IsOptional()
  @IsString()
  allowedDepartments?: string;

  @ApiPropertyOptional({ example: 'manager,super_admin' })
  @IsOptional()
  @IsString()
  allowedRoles?: string;
}
