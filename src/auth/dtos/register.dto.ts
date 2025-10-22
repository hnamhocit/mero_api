import {
  IsEmail,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDTO {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(25)
  displayName: string;
}
