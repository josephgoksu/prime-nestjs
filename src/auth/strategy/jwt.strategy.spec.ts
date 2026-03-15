import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/users/enums/role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockUsersService = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'keys.publicKey') {
        return '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest\n-----END PUBLIC KEY-----';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy, { provide: UsersService, useValue: mockUsersService }, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user for valid payload', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        roles: Role.standard,
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate({ sub: 1, email: 'test@example.com' });

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(strategy.validate({ sub: 999, email: 'missing@example.com' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isActive: false,
        roles: Role.standard,
      };

      mockUsersService.findById.mockResolvedValue(inactiveUser);

      await expect(strategy.validate({ sub: 1, email: 'test@example.com' })).rejects.toThrow(UnauthorizedException);
    });
  });
});
