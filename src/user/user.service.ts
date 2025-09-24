
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanType, Prisma, Subscription } from '@prisma/client';
import { CreateUserDto } from './dto/create.user.dto';
import { Currency } from '../payments/payment.dto';
import * as dayjs from 'dayjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService, @Inject(CACHE_MANAGER) private cache: Cache)  {}


  async isUserExist(telegramId: string) {
    const _user = await this.cache.get(`user:${telegramId}`);
    if (_user) return _user;

    const user = await this.prismaService.user.findUnique({where: {telegramId}});
    await this.cache.set(`user:${telegramId}`, user);

    return user;
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


  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const subs = await this.cache.get(`user:${userId}:subscriptions`) as Subscription[];
    if (subs) return subs;

    const data = await this.prismaService.subscription.findMany({
      where: {
        userId,
        endDate: {
          gte: dayjs().toDate()
        },
        isActive: true
      }
    });

    await this.cache.set(`user:${userId}:subscriptions`, data);
    return data
  }


}
