import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  setterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  closerId?: string;
}
