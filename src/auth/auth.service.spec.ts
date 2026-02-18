import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { LoggerService } from 'src/logger/logger.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;

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

      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz';
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'compareSync').mockReturnValue(true);

      const result = await service.login(userDto);

      expect(result).toHaveProperty('access_token');
      expect(result.email).toBe(userDto.email);
    });

    it('should throw UnauthorizedException for invalid user', async () => {
      const userDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.login(userDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
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

      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'compareSync').mockReturnValue(false);

      await expect(service.login(userDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid fields', async () => {
      const userDto = {
        email: 'not-an-email',
        password: '',
      };

      await expect(service.login(userDto)).rejects.toThrow(BadRequestException);
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

      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'hashSync').mockReturnValue('hashedpassword');

      const result = await service.register(userDto);

      expect(result.msg).toBe('User created with success');
    });

    it('should throw ConflictException for existing user', async () => {
      const userDto = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123',
      };

      mockUsersService.create.mockRejectedValue(new Error('User already exists'));

      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'hashSync').mockReturnValue('hashedpassword');

      await expect(service.register(userDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid content', async () => {
      const userDto = {
        email: 'not-an-email',
        name: '',
        password: '',
      };

      await expect(service.register(userDto)).rejects.toThrow(BadRequestException);
    });
  });
});
