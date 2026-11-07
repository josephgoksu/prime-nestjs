import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../custom.decorator';

export class UsersDTO {
  @NormalizeEmail()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
