import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { EventEmitter } from 'events';

dotenv.config();
export const PaymentEventBus = new EventEmitter();
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  const config = new DocumentBuilder()
    .setTitle('Budget API')
    .setDescription('Бэкенд для контроля бюджета: направления, бюджеты, транзакции, сводка')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste access token here',
      },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .addServer('http://localhost:3000')
    .addServer('https://b337b522b47f.ngrok-free.app')
    .build();

  app.setGlobalPrefix('api/v1');


  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);


  await app.listen(3001);
}
bootstrap();
