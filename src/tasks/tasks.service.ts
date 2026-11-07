import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../logger/logger.service';
import { Membership } from '../organizations/entities/membership.entity';
import { hasOrgRole, OrgRole } from '../organizations/org-role.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

/**
 * Who is asking and in which scope. Without a membership the scope is the
 * user's personal tasks; with one it is that organization's tasks.
 */
export interface TaskScope {
  userId: number;
  membership?: Membership;
}

/**
 * Every query is scoped (see TaskScope). A task outside the scope is reported
 * as not found, so ids of other users' or organizations' tasks cannot be probed.
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly logger: LoggerService,
  ) {}

  /** Example scheduled job. Replace or delete it in your project. */
  @Cron(CronExpression.EVERY_HOUR)
  handleCron() {
    this.logger.debug('Hourly example cron job');
  }

  async create(scope: TaskScope, createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create({
      ...createTaskDto,
      ownerId: scope.userId,
      organizationId: scope.membership?.organizationId ?? null,
    });
    return this.taskRepository.save(task);
  }

  async findAll(scope: TaskScope): Promise<Task[]> {
    return this.taskRepository.find({ where: whereScope(scope), order: { id: 'ASC' } });
  }

  async findOne(scope: TaskScope, id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { ...whereScope(scope), id } });
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return task;
  }

  async update(scope: TaskScope, id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(scope, id);
    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  /** In an organization, only the task's creator or an admin can delete it. */
  async remove(scope: TaskScope, id: number): Promise<void> {
    const task = await this.findOne(scope, id);
    if (scope.membership && task.ownerId !== scope.userId && !hasOrgRole(scope.membership.role, OrgRole.ADMIN)) {
      throw new ForbiddenException('Only the task creator or an admin can delete this task');
    }
    await this.taskRepository.remove(task);
  }
}

function whereScope(scope: TaskScope): FindOptionsWhere<Task> {
  return scope.membership ? { organizationId: scope.membership.organizationId } : { ownerId: scope.userId, organizationId: IsNull() };
}
