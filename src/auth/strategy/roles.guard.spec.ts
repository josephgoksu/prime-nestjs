import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../users/enums/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: Record<string, unknown> | null): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: vi.fn(),
        getNext: vi.fn(),
      }),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
    } as unknown as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext({ roles: Role.standard });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user is missing', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.premium]);

    const context = createMockContext(null);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.premium]);

    const context = createMockContext({ roles: Role.premium });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.premium]);

    const context = createMockContext({ roles: Role.standard });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should support array roles on user', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.premium]);

    const context = createMockContext({ roles: [Role.standard, Role.premium] });
    expect(guard.canActivate(context)).toBe(true);
  });
});
