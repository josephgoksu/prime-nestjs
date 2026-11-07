import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Membership } from './entities/membership.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationsService } from './organizations.service';
import { OrgRole } from './org-role.enum';

const member = (userId: number, role: OrgRole) => ({ id: userId, organizationId: 3, userId, role, createdAt: new Date() }) as Membership;

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  const lockQuery = { setLock: vi.fn(), where: vi.fn(), getOne: vi.fn() };
  // The transaction's entity manager: findOneBy re-reads the caller, findOne loads the target.
  const manager = {
    getRepository: vi.fn(() => ({ createQueryBuilder: () => lockQuery })),
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    count: vi.fn(),
    existsBy: vi.fn(),
    create: vi.fn((_entity: unknown, x: Partial<Membership>) => x),
    save: vi.fn(),
    delete: vi.fn(),
  };
  const dataSource = { transaction: vi.fn((work: (m: typeof manager) => unknown) => work(manager)) };
  const memberships = {};
  const usersService = { findByEmail: vi.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Organization), useValue: {} },
        { provide: getRepositoryToken(Membership), useValue: memberships },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = module.get(OrganizationsService);
    lockQuery.setLock.mockReturnValue(lockQuery);
    lockQuery.where.mockReturnValue(lockQuery);
    lockQuery.getOne.mockResolvedValue({ id: 3 });
  });

  afterEach(() => vi.clearAllMocks());

  describe('membership changes', () => {
    it('checks the caller as re-read under the lock, not the copy the guard loaded', async () => {
      // The guard saw an owner; a change that committed since demoted them to member.
      manager.findOneBy.mockResolvedValue(member(7, OrgRole.MEMBER));

      await expect(service.updateMemberRole(member(7, OrgRole.OWNER), 9, OrgRole.OWNER)).rejects.toThrow(ForbiddenException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('refuses a caller who was removed from the organization meanwhile', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(service.removeMember(member(7, OrgRole.OWNER), 9)).rejects.toThrow(NotFoundException);
      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('keeps at least one owner', async () => {
      manager.findOneBy.mockResolvedValue(member(7, OrgRole.OWNER));
      manager.findOne.mockResolvedValue(member(7, OrgRole.OWNER));
      manager.count.mockResolvedValue(1);

      await expect(service.updateMemberRole(member(7, OrgRole.OWNER), 7, OrgRole.ADMIN)).rejects.toThrow(ConflictException);
    });

    it('lets an owner demote another owner', async () => {
      manager.findOneBy.mockResolvedValue(member(7, OrgRole.OWNER));
      manager.findOne.mockResolvedValue({ ...member(9, OrgRole.OWNER), user: { name: 'b', email: 'b@example.com' } });
      manager.count.mockResolvedValue(2);

      await expect(service.updateMemberRole(member(7, OrgRole.OWNER), 9, OrgRole.MEMBER)).resolves.toMatchObject({ userId: 9, role: OrgRole.MEMBER });
    });
  });

  describe('addMember', () => {
    beforeEach(() => usersService.findByEmail.mockResolvedValue({ id: 9, name: 'b', email: 'b@example.com' }));

    it('adds the user under the lock', async () => {
      manager.findOneBy.mockResolvedValue(member(7, OrgRole.ADMIN));
      manager.existsBy.mockResolvedValue(false);
      manager.save.mockImplementation((m: Membership) => Promise.resolve({ ...m, createdAt: new Date() }));

      await expect(service.addMember(member(7, OrgRole.ADMIN), { email: 'b@example.com' })).resolves.toMatchObject({
        userId: 9,
        role: OrgRole.MEMBER,
      });
      expect(manager.create).toHaveBeenCalledWith(Membership, { organizationId: 3, userId: 9, role: OrgRole.MEMBER });
    });

    it('reports a duplicate membership as 409', async () => {
      manager.findOneBy.mockResolvedValue(member(7, OrgRole.ADMIN));
      manager.existsBy.mockResolvedValue(true);

      await expect(service.addMember(member(7, OrgRole.ADMIN), { email: 'b@example.com' })).rejects.toThrow(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('refuses a caller demoted since the guard ran', async () => {
      manager.findOneBy.mockResolvedValue(member(7, OrgRole.MEMBER));

      await expect(service.addMember(member(7, OrgRole.ADMIN), { email: 'b@example.com' })).rejects.toThrow(ForbiddenException);
    });

    it('lets only owners add owners', async () => {
      manager.findOneBy.mockResolvedValue(member(7, OrgRole.ADMIN));

      await expect(service.addMember(member(7, OrgRole.ADMIN), { email: 'b@example.com', role: OrgRole.OWNER })).rejects.toThrow(ForbiddenException);
    });

    it('reports an unknown email as 404', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.addMember(member(7, OrgRole.ADMIN), { email: 'x@example.com' })).rejects.toThrow(NotFoundException);
    });
  });
});
