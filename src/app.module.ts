import { Module } from '@nestjs/common/decorators';

import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from './bot/bot.service';
import { TelegramOperator } from './bot/operator/telegram';
import { HealthModule } from './helth/health.module';
import { PaymentController } from './payments/payment.controller';
import { PaymentService } from './payments/payment.service';
import { QuestionService } from './question/question.service';
import { UserService } from './user/user.service';
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
    HealthModule,
  ],
  providers: [
    BotService,
    TelegramOperator,
    PrismaService,
    PaymentService,
    UserService,
    QuestionService,
  ],
  exports: [PrismaService],
  controllers: [PaymentController],
})
export class AppModule {}
