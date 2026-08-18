import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClientNoteCategory } from '@prisma/client';

export class SaveClientNoteDto {
  @ApiPropertyOptional({ enum: ClientNoteCategory })
  @IsOptional()
  @IsEnum(ClientNoteCategory)
  category?: ClientNoteCategory;

  @IsNotEmpty()
  @IsString()
  content: string;
}
