
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanType, Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create.user.dto';
import { Currency } from '../payments/payment.dto';
import * as dayjs from 'dayjs';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService)  {}

  async isUserExist(telegramId: string) {
    const user = await this.prismaService.user.findUnique({where: {telegramId}})
    return user
  }
  async create(user: CreateUserDto) {
    return this.prismaService.user.create({data: {
      ...user,
      }})
  }

  async findAll() {
    return this.prismaService.user.findMany()
  }

  async createSubscription(userId: string) {
    return this.prismaService.subscription.create({data: {
        startDate: dayjs().toDate(),
        endDate: dayjs().add(1, 'month').toDate(),
        isActive: true,
        user: {
          connect: {
            id: userId
          }
        },
        plan: {
          connectOrCreate: {
            where: {
              code: PlanType.SUBSCRIPTION
            },
            create: {
              code: PlanType.SUBSCRIPTION,
              name: 'Подписка на месяц',
              description: '30 дней. Квота не ограничена (безлимит).',
              priceRub: 399,
              type: PlanType.SUBSCRIPTION,
              creditsReward: null,
              periodDays: 30,
              periodQuota: null,
            }
          }
        }
      }})
  }

  async getUserSubscriptions(userId: string) {
    const data = await this.prismaService.subscription.findMany({
      where: {
        userId,
        endDate: {
          gte: dayjs().toDate()
        },
        isActive: true
      }
    })
    return data
  }


}
