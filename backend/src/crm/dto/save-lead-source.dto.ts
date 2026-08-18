import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveLeadSourceDto {
  @ApiProperty({ example: 'Meta Ads' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
