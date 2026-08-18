import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ConvertLeadDto {
  @ApiPropertyOptional({ description: 'Link to this existing client instead of creating a new one' })
  @IsOptional()
  @IsUUID()
  linkToClientId?: string;

  @ApiPropertyOptional({ description: 'Proceed even though a possible duplicate client was found' })
  @IsOptional()
  @IsBoolean()
  confirmCreateAnyway?: boolean;
}
