import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Membership } from './entities/membership.entity';

/** The caller's membership set by OrganizationGuard, or undefined in personal scope. */
export const CurrentMembership = createParamDecorator((_data: unknown, ctx: ExecutionContext): Membership | undefined => {
  return ctx.switchToHttp().getRequest<{ membership?: Membership }>().membership;
});
