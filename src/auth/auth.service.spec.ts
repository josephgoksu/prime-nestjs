import type { Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../logger/logger.service';

vi.mock('bcryptjs', () => ({
  compareSync: vi.fn(),
  hashSync: vi.fn(() => 'hashedpassword'),
}));

import { compareSync, hashSync } from 'bcryptjs';

const mockCompareSync = compareSync as Mock;
const mockHashSync = hashSync as Mock;

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: vi.fn(),
  };

  const mockUsersService = {
    findOne: vi.fn(),
    create: vi.fn(),
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        isActive: true,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');
      mockCompareSync.mockReturnValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result.email).toBe(loginDto.email);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: loginDto.email,
      });
    });

    it('should throw UnauthorizedException for invalid user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        isActive: true,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockCompareSync.mockReturnValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for disabled account', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        isActive: false,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockCompareSync.mockReturnValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      };

      mockHashSync.mockReturnValue('hashedpassword');
      mockUsersService.create.mockResolvedValue({
        id: 1,
        ...registerDto,
        password: 'hashedpassword',
      });

      const result = await service.register(registerDto);

      expect(result.msg).toBe('User created with success');
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: 'hashedpassword',
      });
    });

    it('should throw ConflictException for duplicate key error message', async () => {
      const registerDto = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123',
      };

      mockHashSync.mockReturnValue('hashedpassword');
      mockUsersService.create.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for PostgreSQL error code 23505', async () => {
      const registerDto = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123',
      };

      mockHashSync.mockReturnValue('hashedpassword');
      const pgError = Object.assign(new Error('unique violation'), { code: '23505' });
      mockUsersService.create.mockRejectedValue(pgError);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should rethrow non-duplicate-key errors', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      };

      mockHashSync.mockReturnValue('hashedpassword');
      const dbError = new Error('connection refused');
      mockUsersService.create.mockRejectedValue(dbError);

      await expect(service.register(registerDto)).rejects.toThrow(dbError);
    });
  });
});
