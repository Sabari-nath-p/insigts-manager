import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReopenPayrollDto {
  @ApiProperty({ example: 'Attendance correction approved for Aug 14' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
