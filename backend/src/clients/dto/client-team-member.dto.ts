import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveClientTeamMemberDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsString()
  role: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  assignedDate?: string;
}
