import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Membership } from './entities/membership.entity';
import { hasOrgRole, OrgRole } from './org-role.enum';
import { parseId } from '../parse-id.pipe';

/** Header that selects the organization for routes without an `:orgId` path parameter. */
export const ORG_HEADER = 'x-organization-id';

export const ORG_ROLE_KEY = 'orgRole';
/** The route needs an organization and at least this role in it. */
export const RequireOrgRole = (role: OrgRole) => SetMetadata(ORG_ROLE_KEY, role);

export interface OrgRequest {
  user: User;
  params?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  membership?: Membership;
}

/**
 * Resolves the organization from `:orgId` or the X-Organization-Id header and
 * loads the caller's membership into `request.membership`. Use after JwtAuthGuard.
 *
 * - No organization given (no header at all): passes with no membership (personal scope), unless
 *   the route has @RequireOrgRole, then 400.
 * - Caller is not a member: 404, so organization ids cannot be probed.
 * - Caller's role is below @RequireOrgRole: 403.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<OrgRole | undefined>(ORG_ROLE_KEY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest<OrgRequest>();

    const header = request.headers[ORG_HEADER];
    const raw = request.params?.orgId ?? (Array.isArray(header) ? header[0] : header);
    // An empty header is a client bug (for example an unset variable): it fails
    // with a 400 instead of quietly falling back to personal scope.
    if (raw === undefined) {
      if (required) {
        throw new BadRequestException('Organization id is required');
      }
      return true;
    }

    const membership = await this.memberships.findOne({
      where: { organizationId: parseId(raw, 'Organization id'), userId: request.user.id },
    });
    if (!membership) {
      throw new NotFoundException('Organization not found');
    }
    if (required && !hasOrgRole(membership.role, required)) {
      throw new ForbiddenException(`Requires the ${required} role in this organization`);
    }
    request.membership = membership;
    return true;
  }
}
