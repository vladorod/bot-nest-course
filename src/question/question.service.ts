import { Inject, Injectable } from '@nestjs/common';
import { Difficulty, InterviewLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export type QuestionFilters = {
  categoryId?: string;
  subcategoryId?: string | null;
  difficulty?: Difficulty;
  interviewLevel?: InterviewLevel | null;
  isActive?: boolean;
};

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService, @Inject(CACHE_MANAGER) private cache: Cache ) {}


  async getById(id: string) {
    const quest = await this.cache.get(`question:${id}`);
    if (quest) return quest;
    const _quest = await this.prisma.question.findUnique({ where: { id } });
    await this.cache.set(`question:${id}`, _quest, 60 * 15);

    return _quest;
  }

  async getRandom(filters: QuestionFilters = {}) {
    const where: Prisma.QuestionWhereInput = {
      isActive: filters.isActive ?? true,
      categoryId: filters.categoryId,
      subcategoryId: filters.subcategoryId ?? undefined,
      difficulty: filters.difficulty,
      interviewLevel: filters.interviewLevel ?? undefined,
    };

    const count = await this.prisma.question.count({ where });
    if (count === 0) return null;

    const skip = Math.floor(Math.random() * count);
    const [question] = await this.prisma.question.findMany({
      where,
      take: 1,
      skip,
    });
    return question ?? null;
  }


  async getMany(
    filters: QuestionFilters = {},
    options: {
      take?: number;
      skip?: number;
      orderBy?: Prisma.QuestionOrderByWithRelationInput;
    } = {},
  ) {
    const where: Prisma.QuestionWhereInput = {
      isActive: filters.isActive ?? true,
      categoryId: filters.categoryId,
      subcategoryId: filters.subcategoryId ?? undefined,
      difficulty: filters.difficulty,
      interviewLevel: filters.interviewLevel ?? undefined,
    };
    const hash = btoa(JSON.stringify(where));
    const cache = await this.cache.get(`questions:${hash}`);
    if (cache) return cache;

    const questions =  this.prisma.question.findMany({
      where,
      take: options.take ?? 20,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });

    await this.cache.set(`questions:${hash}`, questions, 60 * 15);
    return questions;
  }
}
