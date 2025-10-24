import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDTO {
  @ApiProperty({ example: 'example@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password', minLength: 8 })
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'John Doe', minLength: 3, maxLength: 25 })
  @IsString()
  @MinLength(3)
  @MaxLength(25)
  displayName: string;
}
