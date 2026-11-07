import { ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersDTO } from '../users/dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';
import { User } from '../users/entities/user.entity';

export interface AuthTokens {
  email: string;
  token_type: 'Bearer';
  access_token: string;
  /** Access token lifetime in seconds. */
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_at: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * Hash verified when the email is unknown, so a missing account takes as
   * long to reject as a wrong password and cannot be detected by timing.
   */
  private dummyHash = '';

  constructor(
    private readonly logger: LoggerService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.passwordService.hash('timing-equaliser-not-a-real-password');
  }

  async login(dto: LoginDTO): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      await this.passwordService.verify(dto.password, this.dummyHash);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.passwordService.verify(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    if (this.passwordService.needsRehash(user.password)) {
      // Upgrade legacy bcrypt (or weaker scrypt) hashes on successful login.
      // A failure here must not block the login.
      try {
        await this.usersService.updatePassword(user.id, await this.passwordService.hash(dto.password));
      } catch (error) {
        this.logger.warn(`Could not rehash password for user ${user.id}: ${(error as Error).message}`);
      }
    }

    return this.issueTokens(user, await this.refreshTokens.issue(user.id));
  }

  /** Rotates a refresh token and returns a fresh token pair. */
  async refresh(presented: string): Promise<AuthTokens> {
    const { userId, refreshToken } = await this.refreshTokens.rotate(presented);
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      await this.refreshTokens.revokeAllForUser(userId);
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueTokens(user, refreshToken);
  }

  /** Ends the session that the refresh token belongs to. */
  logout(presented: string): Promise<void> {
    return this.refreshTokens.revoke(presented);
  }

  private issueTokens(user: Pick<User, 'id' | 'email'>, refreshToken: { token: string; expiresAt: Date }): AuthTokens {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    const { exp, iat } = this.jwtService.decode<{ exp: number; iat: number }>(accessToken);
    return {
      email: user.email,
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: exp - iat,
      refresh_token: refreshToken.token,
      refresh_token_expires_at: refreshToken.expiresAt.toISOString(),
    };
  }

  async register(dto: UsersDTO): Promise<{ msg: string }> {
    const hashedPassword = await this.passwordService.hash(dto.password);

    try {
      await this.usersService.create({
        ...dto,
        password: hashedPassword,
      });
    } catch (error) {
      const isUniqueViolation =
        (error as Record<string, unknown>)?.code === '23505' || (error instanceof Error && error.message?.includes('duplicate key'));
      if (isUniqueViolation) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }

    return { msg: 'User created with success' };
  }
}
