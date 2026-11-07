import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/strategy/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(user.id, createTaskDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.tasksService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(user.id, id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(user.id, id);
  }
}
