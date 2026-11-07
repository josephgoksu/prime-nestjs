import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../logger/logger.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = { sign: vi.fn(), decode: vi.fn(() => ({ iat: 1000, exp: 1900 })) };
  const mockUsersService = {
    findByEmailWithPassword: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updatePassword: vi.fn(),
  };
  const mockPasswordService = {
    hash: vi.fn(),
    verify: vi.fn(),
    needsRehash: vi.fn(),
  };
  const refreshExpiry = new Date('2030-01-01T00:00:00Z');
  const mockRefreshTokens = {
    issue: vi.fn(() => Promise.resolve({ token: 'rt-1', expiresAt: refreshExpiry })),
    rotate: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
  };
  const mockLoggerService = { debug: vi.fn(), log: vi.fn(), error: vi.fn(), warn: vi.fn() };

  const activeUser = {
    id: 1,
    email: 'test@example.com',
    password: 'scrypt$hash',
    name: 'Test User',
    isActive: true,
  };

  beforeEach(async () => {
    mockPasswordService.hash.mockResolvedValue('scrypt$hashed');
    mockPasswordService.needsRehash.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: RefreshTokenService, useValue: mockRefreshTokens },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    await service.onModuleInit();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('returns an access token for valid credentials', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(activeUser);
      mockPasswordService.verify.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        email: activeUser.email,
        token_type: 'Bearer',
        access_token: 'mock-jwt-token',
        expires_in: 900,
        refresh_token: 'rt-1',
        refresh_token_expires_at: refreshExpiry.toISOString(),
      });
      expect(mockRefreshTokens.issue).toHaveBeenCalledWith(activeUser.id);
      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: activeUser.id, email: activeUser.email });
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('still runs a hash check for an unknown email, then rejects', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPasswordService.verify).toHaveBeenCalledWith(loginDto.password, 'scrypt$hashed');
    });

    it('rejects a wrong password', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(activeUser);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a disabled account', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue({ ...activeUser, isActive: false });
      mockPasswordService.verify.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow('Account is disabled');
    });

    it('rehashes a legacy hash after a successful login', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue({ ...activeUser, password: '$2a$10$legacy' });
      mockPasswordService.verify.mockResolvedValue(true);
      mockPasswordService.needsRehash.mockReturnValue(true);
      mockJwtService.sign.mockReturnValue('token');

      await service.login(loginDto);

      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(activeUser.id, 'scrypt$hashed');
    });

    it('still logs in when the rehash fails', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue({ ...activeUser, password: '$2a$10$legacy' });
      mockPasswordService.verify.mockResolvedValue(true);
      mockPasswordService.needsRehash.mockReturnValue(true);
      mockUsersService.updatePassword.mockRejectedValue(new Error('db down'));
      mockJwtService.sign.mockReturnValue('token');

      await expect(service.login(loginDto)).resolves.toHaveProperty('access_token', 'token');
      expect(mockLoggerService.warn).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('returns a new token pair for an active user', async () => {
      mockRefreshTokens.rotate.mockResolvedValue({ userId: 1, refreshToken: { token: 'rt-2', expiresAt: refreshExpiry } });
      mockUsersService.findById.mockResolvedValue(activeUser);
      mockJwtService.sign.mockReturnValue('new-access');

      const result = await service.refresh('rt-1');

      expect(mockRefreshTokens.rotate).toHaveBeenCalledWith('rt-1');
      expect(result).toMatchObject({ access_token: 'new-access', refresh_token: 'rt-2' });
    });

    it('revokes every session and rejects a disabled or deleted user', async () => {
      mockRefreshTokens.rotate.mockResolvedValue({ userId: 1, refreshToken: { token: 'rt-2', expiresAt: refreshExpiry } });
      mockUsersService.findById.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(service.refresh('rt-1')).rejects.toThrow(UnauthorizedException);
      expect(mockRefreshTokens.revokeAllForUser).toHaveBeenCalledWith(1);
    });
  });

  describe('logout', () => {
    it('revokes the session', async () => {
      await service.logout('rt-1');
      expect(mockRefreshTokens.revoke).toHaveBeenCalledWith('rt-1');
    });
  });

  describe('register', () => {
    const registerDto = { email: 'new@example.com', name: 'New User', password: 'password123' };

    it('stores the hashed password', async () => {
      mockUsersService.create.mockResolvedValue({ id: 1 });

      const result = await service.register(registerDto);

      expect(result.msg).toBe('User created with success');
      expect(mockUsersService.create).toHaveBeenCalledWith({ ...registerDto, password: 'scrypt$hashed' });
    });

    it('maps a duplicate key message to ConflictException', async () => {
      mockUsersService.create.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('maps PostgreSQL error code 23505 to ConflictException', async () => {
      mockUsersService.create.mockRejectedValue(Object.assign(new Error('unique violation'), { code: '23505' }));

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('rethrows other errors', async () => {
      const dbError = new Error('connection refused');
      mockUsersService.create.mockRejectedValue(dbError);

      await expect(service.register(registerDto)).rejects.toThrow(dbError);
    });
  });
});
