import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class SaveClientLinkDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  url: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
