import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../logger/logger.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

/**
 * Every query is scoped to the owner. A task that belongs to someone else is
 * reported as not found, so ids of other users' tasks cannot be probed.
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

  async create(ownerId: number, createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create({ ...createTaskDto, ownerId });
    return this.taskRepository.save(task);
  }

  async findAll(ownerId: number): Promise<Task[]> {
    return this.taskRepository.find({ where: { ownerId }, order: { id: 'ASC' } });
  }

  async findOne(ownerId: number, id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id, ownerId } });
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    return task;
  }

  async update(ownerId: number, id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(ownerId, id);
    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async remove(ownerId: number, id: number): Promise<void> {
    const task = await this.findOne(ownerId, id);
    await this.taskRepository.remove(task);
  }
}
