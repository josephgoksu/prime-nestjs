import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // Close the HTTP server and DB pool cleanly on SIGTERM (containers, rolling deploys).
    app.enableShutdownHooks();

    // Behind a load balancer, set TRUST_PROXY so client IPs (and rate limits) are correct.
    app.set('trust proxy', configService.get<boolean | number | string>('trustProxy', false));

    // Security middleware
    app.use(helmet());

    const allowedOrigins = configService.get<string[]>('allowedOrigins', ['http://localhost:3000']);
    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    });

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Swagger - only enable in non-production environments
    if (configService.get('env') !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Prime NestJS')
        .setDescription('Production-ready NestJS API starter')
        .setVersion(process.env.npm_package_version ?? 'dev')
        .addBearerAuth()
        .addTag('api')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document);
    }

    const port = configService.get<number>('port', 3000);
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Error during application bootstrap:', error);
    process.exit(1);
  }
}

void bootstrap();
