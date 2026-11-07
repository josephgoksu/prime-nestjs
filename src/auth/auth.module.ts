import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { LoggerModule } from '../logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt', property: 'user', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService.get<string>('keys.privateKey'),
        publicKey: configService.get<string>('keys.publicKey'),
        // Validated by validateEnv(); the config defaults it to 15m.
        signOptions: { expiresIn: configService.getOrThrow<string>('jwt.expiresIn') as JwtSignOptions['expiresIn'], algorithm: 'RS256' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, PasswordService, RefreshTokenService],
  exports: [AuthService, PasswordService, RefreshTokenService, JwtModule, PassportModule],
  controllers: [AuthController],
})
export class AuthModule {}
