import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Security middleware
    app.use(helmet());
    app.enableCors({
      origin: configService.get('ALLOWED_ORIGINS', '*'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    });

    // Global prefix and pipes
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Prime Nestjs')
      .setDescription('Boilerplate for nestjs')
      .setVersion('2.0.0')
      .addBearerAuth()
      .addTag('api')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = configService.get('PORT', 3000);
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    console.error('Error during application bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
