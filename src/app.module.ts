import { Module } from '@nestjs/common/decorators';

import { ConfigModule } from '@nestjs/config';
import { BotService } from './service/bots/bot.service';
import { TelegramOperator } from './service/bots/operator/telegram';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './service/user/user.service';
export const isDev =
  process.env.USERNAME === 'effec' || process.env.USERNAME === 'Gaming';

if (isDev) {
  require('dotenv').config({ path: __dirname + '../../.env' });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // чтобы переменные окружения были доступны во всей программе
    }),
  ],
  providers: [BotService, TelegramOperator, PrismaService, UserService],
  exports: [PrismaService]
})

export class AppModule {}
