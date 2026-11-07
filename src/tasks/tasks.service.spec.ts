import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task, TaskStatus } from './entities/task.entity';
import { LoggerService } from '../logger/logger.service';
import { Membership } from '../organizations/entities/membership.entity';
import { OrgRole } from '../organizations/org-role.enum';

const personal = { userId: 7 };
const inOrg = (role: OrgRole) => ({ userId: 7, membership: { organizationId: 3, userId: 7, role } as Membership });

describe('TasksService', () => {
  let service: TasksService;

  const mockRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
  };

  const mockLoggerService = {
    debug: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
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
    vi.clearAllMocks();
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

      const result = await service.create(personal, createTaskDto);

      expect(mockRepository.create).toHaveBeenCalledWith({ ...createTaskDto, ownerId: 7, organizationId: null });
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

      const result = await service.findAll(personal);

      expect(mockRepository.find).toHaveBeenCalledWith({ where: { ownerId: 7, organizationId: IsNull() }, order: { id: 'ASC' } });
      expect(result).toEqual(tasks);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const task = { id: 1, title: 'Test Task', status: TaskStatus.OPEN };

      mockRepository.findOne.mockResolvedValue(task);

      const result = await service.findOne(personal, 1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { ownerId: 7, organizationId: IsNull(), id: 1 } });
      expect(result).toEqual(task);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(personal, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const existingTask = { id: 1, title: 'Old Title', status: TaskStatus.OPEN };
      const updateTaskDto = { title: 'Updated Title' };
      const updatedTask = { ...existingTask, ...updateTaskDto };

      mockRepository.findOne.mockResolvedValue(existingTask);
      mockRepository.save.mockResolvedValue(updatedTask);

      const result = await service.update(personal, 1, updateTaskDto);

      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when updating non-existent task', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(personal, 999, { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      const task = { id: 1, title: 'Test Task', status: TaskStatus.OPEN };

      mockRepository.findOne.mockResolvedValue(task);
      mockRepository.remove.mockResolvedValue(task);

      await service.remove(personal, 1);

      expect(mockRepository.remove).toHaveBeenCalledWith(task);
    });

    it('should throw NotFoundException when removing non-existent task', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(personal, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('organization scope', () => {
    it('creates the task in the organization', async () => {
      mockRepository.create.mockImplementation((t: unknown) => t);
      mockRepository.save.mockImplementation((t: unknown) => Promise.resolve(t));

      await service.create(inOrg(OrgRole.MEMBER), { title: 'Shared' });

      expect(mockRepository.create).toHaveBeenCalledWith({ title: 'Shared', ownerId: 7, organizationId: 3 });
    });

    it("lists every member's tasks in the organization", async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.findAll(inOrg(OrgRole.MEMBER));

      expect(mockRepository.find).toHaveBeenCalledWith({ where: { organizationId: 3 }, order: { id: 'ASC' } });
    });

    it("stops a member deleting someone else's task", async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, ownerId: 8, organizationId: 3 });

      await expect(service.remove(inOrg(OrgRole.MEMBER), 1)).rejects.toThrow(ForbiddenException);
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });

    it("lets an admin delete someone else's task", async () => {
      const task = { id: 1, ownerId: 8, organizationId: 3 };
      mockRepository.findOne.mockResolvedValue(task);

      await service.remove(inOrg(OrgRole.ADMIN), 1);

      expect(mockRepository.remove).toHaveBeenCalledWith(task);
    });

    it('lets a member delete their own task', async () => {
      const task = { id: 1, ownerId: 7, organizationId: 3 };
      mockRepository.findOne.mockResolvedValue(task);

      await service.remove(inOrg(OrgRole.MEMBER), 1);

      expect(mockRepository.remove).toHaveBeenCalledWith(task);
    });
  });

  describe('scheduled methods', () => {
    it('logs from the example cron job', () => {
      service.handleCron();
      expect(mockLoggerService.debug).toHaveBeenCalledWith('Hourly example cron job');
    });
  });
});
