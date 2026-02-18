import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  const mockAppService = {
    getHello: jest.fn(),
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      const expectedResult = { message: 'Hello World!' };
      mockAppService.getHello.mockReturnValue(expectedResult);

      const result = appController.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('healthCheck', () => {
    it('should return health check message', () => {
      const expectedResult = { message: 'up' };
      mockAppService.healthCheck.mockReturnValue(expectedResult);

      const result = appController.healthCheck();

      expect(appService.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('echo', () => {
    it('should echo the request body', () => {
      const body = { message: 'test' };

      const result = appController.echo(body);

      expect(result).toEqual(body);
    });
  });

  describe('premiumEcho', () => {
    it('should echo the request body for premium users', () => {
      const body = { message: 'premium test' };

      const result = appController.premiumEcho(body);

      expect(result).toEqual(body);
    });
  });
});
