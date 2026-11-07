import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CurrentMembership } from '../organizations/current-membership.decorator';
import { Membership } from '../organizations/entities/membership.entity';
import { OrganizationGuard } from '../organizations/organization.guard';

/**
 * Personal tasks by default. Send X-Organization-Id to work on an
 * organization's tasks instead; the caller must be a member.
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiHeader({ name: 'X-Organization-Id', required: false, description: "Work on this organization's tasks instead of personal ones" })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: User, @CurrentMembership() membership: Membership | undefined, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create({ userId: user.id, membership }, createTaskDto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @CurrentMembership() membership: Membership | undefined) {
    return this.tasksService.findAll({ userId: user.id, membership });
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @CurrentMembership() membership: Membership | undefined, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne({ userId: user.id, membership }, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @CurrentMembership() membership: Membership | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update({ userId: user.id, membership }, id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @CurrentMembership() membership: Membership | undefined, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove({ userId: user.id, membership }, id);
  }
}
