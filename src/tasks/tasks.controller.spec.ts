import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

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
    it('should create a task', () => {
      const createTaskDto = { title: 'Test Task', description: 'Test Description' };
      const expectedResult = 'This action adds a new task';

      mockTasksService.create.mockReturnValue(expectedResult);

      const result = controller.create(createTaskDto);

      expect(tasksService.create).toHaveBeenCalledWith(createTaskDto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all tasks', () => {
      const expectedResult = 'This action returns all tasks';

      mockTasksService.findAll.mockReturnValue(expectedResult);

      const result = controller.findAll();

      expect(tasksService.findAll).toHaveBeenCalled();
      expect(result).toBe(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single task', () => {
      const id = '1';
      const expectedResult = 'This action returns a #1 task';

      mockTasksService.findOne.mockReturnValue(expectedResult);

      const result = controller.findOne(id);

      expect(tasksService.findOne).toHaveBeenCalledWith(1);
      expect(result).toBe(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a task', () => {
      const id = '1';
      const updateTaskDto = { title: 'Updated Task' };
      const expectedResult = 'This action updates a #1 task';

      mockTasksService.update.mockReturnValue(expectedResult);

      const result = controller.update(id, updateTaskDto);

      expect(tasksService.update).toHaveBeenCalledWith(1, updateTaskDto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('remove', () => {
    it('should remove a task', () => {
      const id = '1';
      const expectedResult = 'This action removes a #1 task';

      mockTasksService.remove.mockReturnValue(expectedResult);

      const result = controller.remove(id);

      expect(tasksService.remove).toHaveBeenCalledWith(1);
      expect(result).toBe(expectedResult);
    });
  });
});
