import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane.doe@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsNotEmpty()
  password: string;
}
