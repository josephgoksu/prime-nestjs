/** A member's role inside one organization. Separate from the global user Role. */
export enum OrgRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

const RANK: Record<OrgRole, number> = {
  [OrgRole.MEMBER]: 0,
  [OrgRole.ADMIN]: 1,
  [OrgRole.OWNER]: 2,
};

/** True when `role` is `required` or higher (owner > admin > member). */
export const hasOrgRole = (role: OrgRole, required: OrgRole): boolean => RANK[role] >= RANK[required];
