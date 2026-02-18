import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hashSync } from 'bcryptjs';
import { UsersDTO } from 'src/users/dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { validate } from 'class-validator';
import { LoggerService } from 'src/logger/logger.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: LoggerService,
    private jwtService: JwtService,
    private userservice: UsersService,
  ) {}

  async login(body: any): Promise<Record<string, any>> {
    const loginDTO = new LoginDTO();
    loginDTO.email = body.email;
    loginDTO.password = body.password;

    const errors = await validate(loginDTO);
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.map((e) => Object.values(e.constraints)).flat(),
      );
    }

    const userDetails = await this.userservice.findOne(body.email);
    if (!userDetails) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = compareSync(body.password, userDetails.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      email: body.email,
      access_token: this.jwtService.sign({ email: body.email }),
    };
  }

  async register(body: any): Promise<Record<string, any>> {
    const userDTO = new UsersDTO();
    userDTO.email = body.email;
    userDTO.name = body.name;
    userDTO.password = body.password;

    const errors = await validate(userDTO);
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.map((e) => Object.values(e.constraints)).flat(),
      );
    }

    userDTO.password = hashSync(body.password, 10);

    try {
      await this.userservice.create(userDTO);
    } catch (error) {
      this.logger.debug(error.message);
      throw new ConflictException('User already exists');
    }

    return { msg: 'User created with success' };
  }
}
