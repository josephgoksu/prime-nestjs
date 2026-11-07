import { BadRequestException, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Membership } from './entities/membership.entity';
import { OrganizationGuard, OrgRequest } from './organization.guard';
import { OrgRole } from './org-role.enum';

describe('OrganizationGuard', () => {
  const findOne = vi.fn();
  const reflector = { getAllAndOverride: vi.fn() };
  let guard: OrganizationGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [OrganizationGuard, { provide: Reflector, useValue: reflector }, { provide: getRepositoryToken(Membership), useValue: { findOne } }],
    }).compile();
    guard = module.get(OrganizationGuard);
  });

  const context = (request: Partial<OrgRequest>): { ctx: ExecutionContext; request: OrgRequest } => {
    const full = { user: { id: 7 }, headers: {}, ...request } as OrgRequest;
    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => full }),
    } as unknown as ExecutionContext;
    return { ctx, request: full };
  };

  afterEach(() => vi.resetAllMocks());

  it('passes in personal scope when no organization is given', async () => {
    const { ctx, request } = context({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.membership).toBeUndefined();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('rejects a route that requires an organization when none is given', async () => {
    reflector.getAllAndOverride.mockReturnValue(OrgRole.MEMBER);
    await expect(guard.canActivate(context({}).ctx)).rejects.toThrow(BadRequestException);
  });

  it.each(['', 'abc', '0', '-1', '1.5', '2147483648', '99999999999'])('rejects the malformed id %s', async (raw) => {
    await expect(guard.canActivate(context({ headers: { 'x-organization-id': raw } }).ctx)).rejects.toThrow(BadRequestException);
  });

  it('reports 404 when the caller is not a member', async () => {
    findOne.mockResolvedValue(null);
    await expect(guard.canActivate(context({ params: { orgId: '3' } }).ctx)).rejects.toThrow(NotFoundException);
    expect(findOne).toHaveBeenCalledWith({ where: { organizationId: 3, userId: 7 } });
  });

  it('reports 403 when the role is too low', async () => {
    reflector.getAllAndOverride.mockReturnValue(OrgRole.ADMIN);
    findOne.mockResolvedValue({ organizationId: 3, userId: 7, role: OrgRole.MEMBER });
    await expect(guard.canActivate(context({ params: { orgId: '3' } }).ctx)).rejects.toThrow(ForbiddenException);
  });

  it('attaches the membership from the header', async () => {
    const membership = { organizationId: 3, userId: 7, role: OrgRole.OWNER };
    reflector.getAllAndOverride.mockReturnValue(OrgRole.ADMIN);
    findOne.mockResolvedValue(membership);
    const { ctx, request } = context({ headers: { 'x-organization-id': '3' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.membership).toBe(membership);
  });

  it('prefers the path parameter over the header', async () => {
    findOne.mockResolvedValue({ organizationId: 4, userId: 7, role: OrgRole.MEMBER });
    await guard.canActivate(context({ params: { orgId: '4' }, headers: { 'x-organization-id': '3' } }).ctx);
    expect(findOne).toHaveBeenCalledWith({ where: { organizationId: 4, userId: 7 } });
  });
});
