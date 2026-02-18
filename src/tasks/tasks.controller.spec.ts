import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskStatus } from './entities/task.entity';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: TasksService;

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto = { title: 'Test Task', description: 'Test Description' };
      const expectedResult = { id: 1, ...createTaskDto, status: TaskStatus.OPEN };

      mockTasksService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createTaskDto);

      expect(tasksService.create).toHaveBeenCalledWith(createTaskDto);
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

      const result = await controller.findAll();

      expect(tasksService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      const expectedResult = { id: 1, title: 'Test Task', status: TaskStatus.OPEN };

      mockTasksService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(1);

      expect(tasksService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateTaskDto = { title: 'Updated Task' };
      const expectedResult = { id: 1, title: 'Updated Task', status: TaskStatus.OPEN };

      mockTasksService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(1, updateTaskDto);

      expect(tasksService.update).toHaveBeenCalledWith(1, updateTaskDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(tasksService.remove).toHaveBeenCalledWith(1);
    });
  });
});
