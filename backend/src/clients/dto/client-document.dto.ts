import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ClientDocumentCategory } from '@prisma/client';

/** Multipart form fields — documents are always uploaded files (no external-link variant,
 * per spec section 24: contracts/proposals/invoices/reports are files). */
export class UploadClientDocumentDto {
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ClientDocumentCategory })
  @IsOptional()
  @IsEnum(ClientDocumentCategory)
  category?: ClientDocumentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isConfidential?: string; // "true"/"false"
}
