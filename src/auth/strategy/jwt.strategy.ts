import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { AuthService } from '../auth.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService, private userservice: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: `${process.env.PRIVATE_KEY.replace(/\\\\n/gm, '\\n')}`,
      algorithms: ['RS256'],
    });
  }

  /**
   * @description Validate the token and return the user
   * @param payload string
   * @returns User
   */
  async validate(payload: any): Promise<User> {
    // Accept the JWT and attempt to validate it using the user service
    const user = await this.userservice.findOne(payload.email);

    // If the user is not found, throw an error
    if (!user) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }

    // If the user is found, return the user
    return user;
  }
}
