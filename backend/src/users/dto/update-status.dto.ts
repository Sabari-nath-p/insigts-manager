import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PresenceStatus } from '../user.entity';

export class UpdateStatusDto {
  @ApiProperty({ enum: PresenceStatus, example: PresenceStatus.IN_MEETING })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;
}
