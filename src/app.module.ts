import { Module } from '@nestjs/common/decorators';

import { ConfigModule } from '@nestjs/config';
import { BotService } from './service/bots/bot.service';
import { TelegramOperator } from './service/bots/operator/telegram';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './service/user/user.service';
import { CartOfDayService } from './service/cartOfDay/cartOfDay.service';
import { PaymentController } from './service/payments/payment.controller';
import { PaymentService } from './service/payments/payment.service';
import { ScheduleModule } from '@nestjs/schedule';
export const isDev =
  process.env.USERNAME === 'effec' || process.env.USERNAME === 'Gaming';

if (isDev) {
  require('dotenv').config({ path: __dirname + '../../.env' });
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true, // чтобы переменные окружения были доступны во всей программе
    }),
  ],
  providers: [BotService, TelegramOperator, PrismaService, PaymentService, UserService, CartOfDayService],
  exports: [PrismaService],
  controllers: [PaymentController]
})

export class AppModule {}
