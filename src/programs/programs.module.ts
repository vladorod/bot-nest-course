import { Module } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [ProgramsService, PrismaService],
})
export class ProgramsModule {}
