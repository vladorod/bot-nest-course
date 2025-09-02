import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CartOfDayService {
  constructor(private readonly prisma: PrismaService) {

  }

  getCardOfDay(userId: string) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    return this.prisma.cartOfDay.findFirst({where: {
      userId: userId,
      createdAt: {
          gte: start, // >= начало дня
          lt: end,    // < конец дня
        },
      }})
  }

  createCartOfDay(text: string, userId: string) {
    return this.prisma.cartOfDay.create({
      data: {
        text,
        user: {
          connect: {
            id: userId
          }
        },
        createdAt: new Date().toISOString()
      }
    })
  }

}