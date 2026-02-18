import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskStatus } from './entities/task.entity';
import { LoggerService } from 'src/logger/logger.service';

describe('TasksService', () => {
  let service: TasksService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockLoggerService = {
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto = { title: 'Test Task', description: 'Test Description' };
      const task = { id: 1, ...createTaskDto, status: TaskStatus.OPEN };

      mockRepository.create.mockReturnValue(task);
      mockRepository.save.mockResolvedValue(task);

      const result = await service.create(createTaskDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createTaskDto);
      expect(mockRepository.save).toHaveBeenCalledWith(task);
      expect(result).toEqual(task);
    });
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const tasks = [
        { id: 1, title: 'Task 1', status: TaskStatus.OPEN },
        { id: 2, title: 'Task 2', status: TaskStatus.DONE },
      ];

      mockRepository.find.mockResolvedValue(tasks);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(tasks);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const task = { id: 1, title: 'Test Task', status: TaskStatus.OPEN };

      mockRepository.findOne.mockResolvedValue(task);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(task);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const existingTask = { id: 1, title: 'Old Title', status: TaskStatus.OPEN };
      const updateTaskDto = { title: 'Updated Title' };
      const updatedTask = { ...existingTask, ...updateTaskDto };

      mockRepository.findOne.mockResolvedValue(existingTask);
      mockRepository.save.mockResolvedValue(updatedTask);

      const result = await service.update(1, updateTaskDto);

      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when updating non-existent task', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      const task = { id: 1, title: 'Test Task', status: TaskStatus.OPEN };

      mockRepository.findOne.mockResolvedValue(task);
      mockRepository.remove.mockResolvedValue(task);

      await service.remove(1);

      expect(mockRepository.remove).toHaveBeenCalledWith(task);
    });

    it('should throw NotFoundException when removing non-existent task', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('scheduled methods', () => {
    it('should call logger.debug when handleCron is called', () => {
      service.handleCron();
      expect(mockLoggerService.debug).toHaveBeenCalledWith('Cron job running every 10 seconds');
    });

    it('should call logger.debug when handleInterval is called', () => {
      service.handleInterval();
      expect(mockLoggerService.debug).toHaveBeenCalledWith('Called every 10 seconds');
    });

    it('should call logger.debug when handleTimeout is called', () => {
      service.handleTimeout();
      expect(mockLoggerService.debug).toHaveBeenCalledWith('Called once after 5 seconds');
    });
  });
});
