import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveClientMeetingDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  participantUserIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decisions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionItems?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}
