import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER, CacheKey } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CacheTTL } from '@nestjs/common/cache';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService, @Inject(CACHE_MANAGER) private cache: Cache) {
  }

  @CacheKey('programs')
  @CacheTTL(60*15)
  async getPrograms() {
    return this.prisma.program.findMany();
  }


  async getProgram(id: string) {
    const cache = this.cache.get(`program:${id}`);
    if (cache) return cache;
    const program = await this.prisma.program.findUnique({where: {id}})
    await this.cache.set(`program:${id}`, program);
    return program;
  }
}
