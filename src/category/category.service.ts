import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER, CacheKey } from '@nestjs/cache-manager';
import { CacheTTL } from '@nestjs/common/cache';
import { Prisma } from '@prisma/client';
import type { Cache } from 'cache-manager';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService, @Inject(CACHE_MANAGER) private cache: Cache) {
  }

  @CacheKey('categories')
  @CacheTTL(60*15)
  getCategory() {
    return this.prisma.category.findMany();
  }

  addCategory(data: Prisma.CategoryCreateInput) {
    this.prisma.category.create({
      data
    })
   }

   addSubCategory(data: Prisma.SubcategoryCreateInput) {
    this.prisma.subcategory.create({
      data
    })
   }

   async getSubCategoryByCatId(categoryId: string) {
    const cache = await this.cache.get(`subcategory:${categoryId}`);
    if (cache) return cache;

    const subcategory = await this.prisma.subcategory.findMany({
      where: {
        categoryId
      }
    });

    await this.cache.set(`subcategory:${categoryId}`, subcategory, 60 * 15);

     return subcategory
   }

   async getCategoryById(id: string) {
    const cache = await this.cache.get(`category:${id}`);
    if (cache) return cache;

    const categories = await this.prisma.category.findUnique({
      where: {
        id
      }
    });

    await this.cache.set(`category:${id}`, categories, 60 * 15);
    return categories
   }

}
