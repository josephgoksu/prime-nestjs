import { IsEnum } from 'class-validator';
import { OrgRole } from '../org-role.enum';

export class UpdateMemberDto {
  @IsEnum(OrgRole)
  role: OrgRole;
}
