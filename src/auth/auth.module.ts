import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    LoggerModule,
    PassportModule.register({ defaultStrategy: 'jwt', property: 'user', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService.get<string>('keys.privateKey'),
        publicKey: configService.get<string>('keys.publicKey'),
        signOptions: { expiresIn: '1h', algorithm: 'RS256' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, PasswordService],
  exports: [AuthService, PasswordService, JwtModule, PassportModule],
  controllers: [AuthController],
})
export class AuthModule {}
