// src/main.ts
// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────
// Server setup: security middleware, global pipes, interceptors, filters,
// Swagger docs, CORS (explicit origin only — never wildcard).
// ─────────────────────────────────────────────────────────────────────────────

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { seedSystemCategories } from './categories/seeds/categories.seed';

const setupSwagger = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Sajilo Khata API')
    .setDescription('Personal finance tracker REST API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(hpp());
  app.use(cookieParser());

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Global validation — strip unknown fields, coerce types
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Global response shaping
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global error shaping
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — disabled in production
  if (configService.get<string>('NODE_ENV') !== 'production') {
    setupSwagger(app);
  }

  // CORS — explicit origin allowlist, never wildcard
  const corsOrigins = configService.get<string>('CORS_ORIGIN')?.split(',') ?? [];
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Seed system categories once on bootstrap (idempotent)
  await seedSystemCategories(app.get(DataSource));

  const port = configService.get<number>('PORT') ?? 4000;
  await app.listen(port);
}

bootstrap();
