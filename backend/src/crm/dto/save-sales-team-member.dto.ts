import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SalesRole } from '@prisma/client';

export class SaveSalesTeamMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: SalesRole })
  @IsEnum(SalesRole)
  salesRole: SalesRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
