import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskStatus } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Membership } from '../organizations/entities/membership.entity';
import { OrganizationGuard } from '../organizations/organization.guard';
import { OrgRole } from '../organizations/org-role.enum';

const user = { id: 7 } as User;
const personal = { userId: 7, membership: undefined };

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: TasksService;

  const mockTasksService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    })
      .overrideGuard(OrganizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto = { title: 'Test Task', description: 'Test Description' };
      const expectedResult = { id: 1, ...createTaskDto, status: TaskStatus.OPEN };

      mockTasksService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, undefined, createTaskDto);

      expect(tasksService.create).toHaveBeenCalledWith(personal, createTaskDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      const expectedResult = [
        { id: 1, title: 'Task 1', status: TaskStatus.OPEN },
        { id: 2, title: 'Task 2', status: TaskStatus.DONE },
      ];

      mockTasksService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, undefined);

      expect(tasksService.findAll).toHaveBeenCalledWith(personal);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      const expectedResult = { id: 1, title: 'Test Task', status: TaskStatus.OPEN };

      mockTasksService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, undefined, 1);

      expect(tasksService.findOne).toHaveBeenCalledWith(personal, 1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateTaskDto = { title: 'Updated Task' };
      const expectedResult = { id: 1, title: 'Updated Task', status: TaskStatus.OPEN };

      mockTasksService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, undefined, 1, updateTaskDto);

      expect(tasksService.update).toHaveBeenCalledWith(personal, 1, updateTaskDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove(user, undefined, 1);

      expect(tasksService.remove).toHaveBeenCalledWith(personal, 1);
    });

    it('passes the organization membership through', async () => {
      const membership = { organizationId: 3, userId: 7, role: OrgRole.MEMBER } as Membership;
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove(user, membership, 1);

      expect(tasksService.remove).toHaveBeenCalledWith({ userId: 7, membership }, 1);
    });
  });
});
