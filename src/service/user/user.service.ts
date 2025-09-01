
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create.user.dto';

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
        wallet: {
          create: {
            balance: 3,
          }
        }
      }})
  }

  async getUserSubscriptions(userId: string) {
    return await this.prismaService.subscription.findMany({
      where: {
        userId
      }
    })
  }
  async updateBalance(userId: string, balance: number) {
    return this.prismaService.wallet.update({
      where: {
        userId: userId
      },
      data: {
        balance
      }
    })
  }

  async getUserBalance(telegramId: string) {
    const user = await this.prismaService.user.findUnique({where: {telegramId}, include: {wallet: true}})
    return user.wallet;
  }

}
