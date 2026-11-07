import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDTO {
  /** The refresh_token returned by /auth/login or /auth/refresh. */
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  refresh_token: string;
}
