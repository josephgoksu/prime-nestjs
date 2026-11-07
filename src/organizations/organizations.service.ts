import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Membership } from './entities/membership.entity';
import { Organization } from './entities/organization.entity';
import { OrgRole } from './org-role.enum';

export interface OrganizationView extends Organization {
  /** The caller's role in this organization. */
  role: OrgRole;
}

export interface MemberView {
  userId: number;
  name: string;
  email: string;
  role: OrgRole;
  joinedAt: Date;
}

const PG_UNIQUE_VIOLATION = '23505';

/**
 * Organizations and their members. Callers pass the acting user's membership,
 * which OrganizationGuard has already loaded and checked.
 *
 * Role rules: admins manage members and admins; only owners grant, change or
 * remove the owner role; anyone can leave; an organization always keeps at
 * least one owner.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    private readonly usersService: UsersService,
  ) {}

  /** Creates the organization and makes the creator its owner. */
  async create(userId: number, dto: CreateOrganizationDto): Promise<OrganizationView> {
    return this.dataSource.transaction(async (manager) => {
      const organization = await manager.save(manager.create(Organization, { name: dto.name }));
      await manager.save(manager.create(Membership, { organizationId: organization.id, userId, role: OrgRole.OWNER }));
      return { ...organization, role: OrgRole.OWNER };
    });
  }

  /** The organizations the user belongs to, with their role in each. */
  async listForUser(userId: number): Promise<OrganizationView[]> {
    const rows = await this.memberships.find({
      where: { userId },
      relations: { organization: true },
      order: { organizationId: 'ASC' },
    });
    return rows.flatMap((row) => (row.organization ? [{ ...row.organization, role: row.role }] : []));
  }

  async findOne(actor: Membership): Promise<OrganizationView> {
    const organization = await this.organizations.findOneBy({ id: actor.organizationId });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return { ...organization, role: actor.role };
  }

  async update(actor: Membership, dto: UpdateOrganizationDto): Promise<OrganizationView> {
    const organization = await this.findOne(actor);
    if (dto.name !== undefined) {
      organization.name = dto.name;
    }
    const { role, ...entity } = organization;
    const saved = await this.organizations.save(entity);
    return { ...saved, role };
  }

  /** Deletes the organization with its memberships and tasks. */
  async remove(actor: Membership): Promise<void> {
    await this.organizations.delete({ id: actor.organizationId });
  }

  async listMembers(actor: Membership): Promise<MemberView[]> {
    const rows = await this.memberships.find({
      where: { organizationId: actor.organizationId },
      relations: { user: true },
      order: { id: 'ASC' },
    });
    return rows.map(toMemberView);
  }

  /** Adds an existing user. There is no invitation flow: build one on top if you need it. */
  async addMember(actor: Membership, dto: AddMemberDto): Promise<MemberView> {
    const role = dto.role ?? OrgRole.MEMBER;
    if (role === OrgRole.OWNER && actor.role !== OrgRole.OWNER) {
      throw new ForbiddenException('Only owners can add owners');
    }
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('No user with that email');
    }
    try {
      const membership = await this.memberships.save(this.memberships.create({ organizationId: actor.organizationId, userId: user.id, role }));
      return toMemberView({ ...membership, user });
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('User is already a member');
      }
      throw error;
    }
  }

  async updateMemberRole(actor: Membership, userId: number, role: OrgRole): Promise<MemberView> {
    return this.withOrganizationLock(actor.organizationId, async (manager) => {
      const target = await this.findMember(manager, actor.organizationId, userId);
      if ((role === OrgRole.OWNER || target.role === OrgRole.OWNER) && actor.role !== OrgRole.OWNER) {
        throw new ForbiddenException('Only owners can grant or change the owner role');
      }
      if (target.role === OrgRole.OWNER && role !== OrgRole.OWNER) {
        await this.assertAnotherOwner(manager, actor.organizationId);
      }
      target.role = role;
      const { user, ...membership } = target;
      await manager.save(Membership, membership);
      return toMemberView({ ...membership, user });
    });
  }

  /** Removes a member. Members can always remove themselves (leave). */
  async removeMember(actor: Membership, userId: number): Promise<void> {
    await this.withOrganizationLock(actor.organizationId, async (manager) => {
      const target = await this.findMember(manager, actor.organizationId, userId);
      const leaving = target.userId === actor.userId;
      if (!leaving && actor.role === OrgRole.MEMBER) {
        throw new ForbiddenException('Requires the admin role in this organization');
      }
      if (!leaving && target.role === OrgRole.OWNER && actor.role !== OrgRole.OWNER) {
        throw new ForbiddenException('Only owners can remove owners');
      }
      if (target.role === OrgRole.OWNER) {
        await this.assertAnotherOwner(manager, actor.organizationId);
      }
      await manager.delete(Membership, { id: target.id });
    });
  }

  /**
   * Runs membership changes one at a time per organization, so two owners
   * demoting each other at once cannot leave the organization without one.
   */
  private withOrganizationLock<T>(organizationId: number, work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(Organization)
        .createQueryBuilder('organization')
        .setLock('pessimistic_write')
        .where('organization.id = :organizationId', { organizationId })
        .getOne();
      if (!locked) {
        throw new NotFoundException('Organization not found');
      }
      return work(manager);
    });
  }

  private async findMember(manager: EntityManager, organizationId: number, userId: number): Promise<Membership> {
    const member = await manager.findOne(Membership, { where: { organizationId, userId }, relations: { user: true } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    return member;
  }

  private async assertAnotherOwner(manager: EntityManager, organizationId: number): Promise<void> {
    const owners = await manager.count(Membership, { where: { organizationId, role: OrgRole.OWNER } });
    if (owners <= 1) {
      throw new ConflictException('An organization needs at least one owner');
    }
  }
}

function toMemberView(membership: Membership): MemberView {
  return {
    userId: membership.userId,
    name: membership.user?.name ?? '',
    email: membership.user?.email ?? '',
    role: membership.role,
    joinedAt: membership.createdAt,
  };
}
