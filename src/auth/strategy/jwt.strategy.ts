import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private userservice: UsersService,
    private configService: ConfigService,
  ) {
    const publicKey = configService.get<string>('keys.publicKey');
    if (!publicKey) {
      throw new Error('JWT public key is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userservice.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return user;
  }
}
