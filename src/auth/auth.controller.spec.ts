import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return response', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const authResponse = {
        status: 200,
        msg: {
          email: 'test@example.com',
          access_token: 'mock-jwt-token',
        },
      };

      mockAuthService.login.mockResolvedValue(authResponse);

      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.login(mockReq, mockRes, loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(authResponse.msg);
    });
  });

  describe('register', () => {
    it('should call authService.register and return response', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      };

      const authResponse = {
        status: 201,
        content: {
          msg: 'User created with success',
        },
      };

      mockAuthService.register.mockResolvedValue(authResponse);

      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.register(mockReq, mockRes, registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(authResponse.content);
    });
  });
});
