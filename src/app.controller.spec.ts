import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  let authService: AuthService;

  const mockAppService = {
    getHello: jest.fn(),
    healthCheck: jest.fn(),
  };

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
    authService = app.get<AuthService>(AuthService);
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

  describe('getEcho', () => {
    it('should echo the request body', () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const body = { message: 'test' };

      appController.getEcho(mockReq, mockRes, body);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(body);
    });
  });

  describe('getPremiumEcho', () => {
    it('should echo the request body for premium users', () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const body = { message: 'premium test' };

      appController.getPremiumEcho(mockReq, mockRes, body);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(body);
    });
  });
});
