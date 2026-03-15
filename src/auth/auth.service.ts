import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hashSync } from 'bcryptjs';
import { UsersDTO } from 'src/users/dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { LoggerService } from 'src/logger/logger.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: LoggerService,
    private jwtService: JwtService,
    private userservice: UsersService,
  ) {}

  async login(dto: LoginDTO): Promise<{ email: string; access_token: string }> {
    const userDetails = await this.userservice.findOne(dto.email);
    if (!userDetails) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = compareSync(dto.password, userDetails.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!userDetails.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return {
      email: dto.email,
      access_token: this.jwtService.sign({
        sub: userDetails.id,
        email: dto.email,
      }),
    };
  }

  async register(dto: UsersDTO): Promise<{ msg: string }> {
    const hashedPassword = hashSync(dto.password, 10);

    try {
      await this.userservice.create({
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
