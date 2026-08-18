import { ApiPropertyOptional } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiPropertyOptional({ description: 'Reactivate a previously deactivated account by setting this to true' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
