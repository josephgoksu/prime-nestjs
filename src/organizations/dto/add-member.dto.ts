import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { NormalizeEmail } from '../../custom.decorator';
import { OrgRole } from '../org-role.enum';

export class AddMemberDto {
  /** Email of an existing user. */
  @NormalizeEmail()
  @IsEmail()
  email: string;

  /** Defaults to member. Only owners can add owners. */
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;
}
