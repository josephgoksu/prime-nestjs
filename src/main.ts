// Must be the first imports: .env has to be loaded before tracing and the logger
// read their settings, and tracing has to patch modules before they load.
import './config/load-env';
import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { PinoLoggerService } from './logger/pino-logger.service';
import { REQUEST_ID_HEADER, requestLogging } from './logger/request-logging.middleware';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new NestLogger('Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: new PinoLoggerService() });
    const configService = app.get(ConfigService);

    // Close the HTTP server and DB pool cleanly on SIGTERM (containers, rolling deploys).
    // process.exit() at the end lets the asynchronous logger write its last lines;
    // a re-raised signal would end the process without running exit handlers.
    app.enableShutdownHooks([], { useProcessExit: true });

    // Behind a load balancer, set TRUST_PROXY so client IPs (and rate limits) are correct.
    app.set('trust proxy', configService.get<boolean | number | string>('trustProxy', false));

    // First, so requests rejected by helmet, CORS or the body parser get an id and a log line too.
    app.use(requestLogging);

    // Security middleware
    app.use(helmet());

    const allowedOrigins = configService.get<string[]>('allowedOrigins', ['http://localhost:3000']);
    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
      // Lets browser clients read the request id, for example to quote it in a bug report.
      exposedHeaders: [REQUEST_ID_HEADER],
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
