import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportHolidaysDto {
  @ApiProperty({ description: 'CSV content: date,name,type,description,isPaid,isOptional,isTentative,applicableDepartments,isActive' })
  @IsString()
  @IsNotEmpty()
  csv: string;
}
