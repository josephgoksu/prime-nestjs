import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { LoggerService } from 'src/logger/logger.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;
  let loggerService: LoggerService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    create: jest.fn(),
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
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const userDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz'; // Mock hashed password
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Mock bcryptjs compareSync
      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'compareSync').mockReturnValue(true);

      const result = await service.login(userDto);

      expect(result.status).toBe(200);
      expect(result.msg).toHaveProperty('access_token');
      expect(result.msg.email).toBe(userDto.email);
    });

    it('should return 401 for invalid user', async () => {
      const userDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUsersService.findOne.mockResolvedValue(null);

      const result = await service.login(userDto);

      expect(result.status).toBe(401);
      expect(result.msg.msg).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const userDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Mock bcryptjs compareSync to return false
      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'compareSync').mockReturnValue(false);

      const result = await service.login(userDto);

      expect(result.status).toBe(401);
      expect(result.msg.msg).toBe('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should create user successfully', async () => {
      const userDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      };

      mockUsersService.create.mockResolvedValue({
        id: 1,
        ...userDto,
        password: 'hashedpassword',
      });

      // Mock bcryptjs hashSync
      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'hashSync').mockReturnValue('hashedpassword');

      const result = await service.register(userDto);

      expect(result.status).toBe(201);
      expect(result.content.msg).toBe('User created with success');
    });

    it('should return 400 for existing user', async () => {
      const userDto = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123',
      };

      mockUsersService.create.mockRejectedValue(new Error('User already exists'));

      // Mock bcryptjs hashSync
      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'hashSync').mockReturnValue('hashedpassword');

      const result = await service.register(userDto);

      expect(result.status).toBe(400);
      expect(result.content.msg).toBe('User already exists');
    });
  });
});
