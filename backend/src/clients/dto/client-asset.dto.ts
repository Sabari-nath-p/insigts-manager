import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

/** For a link-type asset (JSON body). File-type assets go through the multipart upload endpoint. */
export class CreateClientAssetLinkDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  folder: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  externalUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRestricted?: boolean;
}

/** Multipart form fields for a file-type asset upload — strings only, same convention as
 * UploadKnowledgeResourceDto (tags is comma-separated, split server-side). */
export class UploadClientAssetDto {
  @IsString()
  name: string;

  @IsString()
  folder: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isRestricted?: string; // "true"/"false"
}
