import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class DuplicateHolidaysDto {
  @ApiProperty({ example: 2026, description: 'Calendar year to copy holidays from' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  sourceYear: number;

  @ApiProperty({ example: 2027, description: 'Calendar year to copy holidays into' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  targetYear: number;
}
