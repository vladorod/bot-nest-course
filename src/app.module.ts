import { Module } from '@nestjs/common/decorators';

import { ConfigModule } from '@nestjs/config';
import { BotService } from './bot/bot.service';
import { TelegramOperator } from './bot/operator/telegram';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user/user.service';
import { PaymentController } from './payments/payment.controller';
import { PaymentService } from './payments/payment.service';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './helth/health.module';
import { CacheModule } from '@nestjs/cache-manager';
export const isDev =
  process.env.USERNAME === 'effec' || process.env.USERNAME === 'Gaming';

if (isDev) {
  require('dotenv').config({ path: __dirname + '../../.env' });
}

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true, // чтобы переменные окружения были доступны во всей программе
    }),
    HealthModule
  ],
  providers: [ BotService, TelegramOperator, PrismaService, PaymentService, UserService],
  exports: [PrismaService],
  controllers: [PaymentController]
})

export class AppModule {}
