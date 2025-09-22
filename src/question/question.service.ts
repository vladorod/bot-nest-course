import { Injectable } from '@nestjs/common';
import { Difficulty, InterviewLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type QuestionFilters = {
  categoryId?: string;
  subcategoryId?: string | null;
  difficulty?: Difficulty;
  interviewLevel?: InterviewLevel | null;
  isActive?: boolean;
};

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    return this.prisma.question.findUnique({ where: { id } });
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

    return this.prisma.question.findMany({
      where,
      take: options.take ?? 20,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });
  }
}
