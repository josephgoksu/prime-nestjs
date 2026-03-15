import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDTO {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  password: string;
}
