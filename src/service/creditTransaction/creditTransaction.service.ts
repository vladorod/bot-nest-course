
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CreditTransactionService   {
  constructor(private readonly prismaService: PrismaService)  {}


}
