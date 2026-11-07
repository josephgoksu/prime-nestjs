import { ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersDTO } from '../users/dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';

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
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.passwordService.hash('timing-equaliser-not-a-real-password');
  }

  async login(dto: LoginDTO): Promise<{ email: string; access_token: string }> {
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

    return {
      email: user.email,
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
      }),
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
