import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LeadActivityType } from '@prisma/client';

export class AddLeadActivityDto {
  @ApiProperty({ enum: LeadActivityType })
  @IsEnum(LeadActivityType)
  type: LeadActivityType;

  @ApiProperty({ example: 'Left a voicemail, will try again tomorrow' })
  @IsNotEmpty()
  @IsString()
  description: string;
}
