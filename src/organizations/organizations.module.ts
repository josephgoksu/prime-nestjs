import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Membership } from './entities/membership.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationGuard } from './organization.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Membership]), UsersModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationGuard],
  // Other feature modules use the guard to scope their data to an organization.
  exports: [OrganizationsService, OrganizationGuard, TypeOrmModule],
})
export class OrganizationsModule {}
