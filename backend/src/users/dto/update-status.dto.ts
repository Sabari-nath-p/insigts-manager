import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PresenceStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ enum: PresenceStatus, example: PresenceStatus.in_meeting })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;
}
