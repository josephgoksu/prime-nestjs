import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CurrentMembership } from './current-membership.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Membership } from './entities/membership.entity';
import { OrganizationGuard, RequireOrgRole } from './organization.guard';
import { OrganizationsService } from './organizations.service';
import { ParseIdPipe } from '../parse-id.pipe';
import { StrictThrottle } from '../custom.decorator';
import { OrgRole } from './org-role.enum';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /** Creates an organization. The caller becomes its owner. */
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto);
  }

  /** The caller's organizations, with the caller's role in each. */
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.organizationsService.listForUser(user.id);
  }

  @Get(':orgId')
  @UseGuards(OrganizationGuard)
  @RequireOrgRole(OrgRole.MEMBER)
  findOne(@CurrentMembership() actor: Membership) {
    return this.organizationsService.findOne(actor);
  }

  @Patch(':orgId')
  @UseGuards(OrganizationGuard)
  @RequireOrgRole(OrgRole.ADMIN)
  update(@CurrentMembership() actor: Membership, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(actor, dto);
  }

  /** Deletes the organization, its memberships and its tasks. */
  @Delete(':orgId')
  @UseGuards(OrganizationGuard)
  @RequireOrgRole(OrgRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentMembership() actor: Membership) {
    return this.organizationsService.remove(actor);
  }

  @Get(':orgId/members')
  @UseGuards(OrganizationGuard)
  @RequireOrgRole(OrgRole.MEMBER)
  listMembers(@CurrentMembership() actor: Membership) {
    return this.organizationsService.listMembers(actor);
  }

  /** Adds an existing user by email. It reveals whether an email is registered, so it has the stricter rate limit. */
  @StrictThrottle()
  @Post(':orgId/members')
  @UseGuards(OrganizationGuard)
  @RequireOrgRole(OrgRole.ADMIN)
  addMember(@CurrentMembership() actor: Membership, @Body() dto: AddMemberDto) {
    return this.organizationsService.addMember(actor, dto);
  }

  @Patch(':orgId/members/:userId')
  @UseGuards(OrganizationGuard)
  @RequireOrgRole(OrgRole.ADMIN)
  updateMember(@CurrentMembership() actor: Membership, @Param('userId', new ParseIdPipe('User id')) userId: number, @Body() dto: UpdateMemberDto) {
    return this.organizationsService.updateMemberRole(actor, userId, dto.role);
  }

  /** Removes a member. Any member can remove themselves to leave. */
  @Delete(':orgId/members/:userId')
  @UseGuards(OrganizationGuard)
  @RequireOrgRole(OrgRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@CurrentMembership() actor: Membership, @Param('userId', new ParseIdPipe('User id')) userId: number) {
    return this.organizationsService.removeMember(actor, userId);
  }
}
