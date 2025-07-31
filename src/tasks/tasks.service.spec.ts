import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { LoggerService } from 'src/logger/logger.service';

describe('TasksService', () => {
  let service: TasksService;
  let loggerService: LoggerService;

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
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return a string indicating task creation', () => {
      const createTaskDto = { title: 'Test Task', description: 'Test Description' };
      const result = service.create(createTaskDto);
      expect(result).toBe('This action adds a new task');
    });
  });

  describe('findAll', () => {
    it('should return a string indicating all tasks retrieval', () => {
      const result = service.findAll();
      expect(result).toBe('This action returns all tasks');
    });
  });

  describe('findOne', () => {
    it('should return a string indicating single task retrieval', () => {
      const id = 1;
      const result = service.findOne(id);
      expect(result).toBe(`This action returns a #${id} task`);
    });
  });

  describe('update', () => {
    it('should return a string indicating task update', () => {
      const id = 1;
      const updateTaskDto = { title: 'Updated Task' };
      const result = service.update(id, updateTaskDto);
      expect(result).toBe(`This action updates a #${id} task`);
    });
  });

  describe('remove', () => {
    it('should return a string indicating task removal', () => {
      const id = 1;
      const result = service.remove(id);
      expect(result).toBe(`This action removes a #${id} task`);
    });
  });

  describe('scheduled methods', () => {
    it('should call logger.debug when handleCron is called', () => {
      service.handleCron();
      expect(mockLoggerService.debug).toHaveBeenCalledWith('Called when the current second is 10');
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
