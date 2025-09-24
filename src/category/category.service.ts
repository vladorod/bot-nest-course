import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER, CacheKey } from '@nestjs/cache-manager';
import { CacheTTL } from '@nestjs/common/cache';
import { Category, Prisma, Subcategory } from '@prisma/client';
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

  async getCategories() {
    return this.prisma.category.findMany();
  }

   async getSubCategoryByCatId(categoryId: string): Promise<Category[]> {
    const cache = await this.cache.get(`subcategory:${categoryId}`);
    if (cache) return cache as Category[];

    console.log(categoryId)
    const subcategory = await this.prisma.subcategory.findMany({
      where: {
        categoryId
      }
    });

    await this.cache.set(`subcategory:${categoryId}`, subcategory, 60 * 15);

     //@ts-ignore
     return subcategory
   }

   @CacheKey('categories')
   @CacheTTL(60*15)
   async getSubCategorises(): Promise<Subcategory[]> {
     return await this.prisma.subcategory.findMany();
   }

  async getCategoryByProgramId(programId: string): Promise<Category[]> {
    const cache = await this.cache.get(`category:programId:${programId}`);
    if (cache) return cache as Category[];

    const categories = await this.prisma.category.findMany({
      where: {
        program: {
          id: programId,
        }
      }
    }) as Category[];

    await this.cache.set(`category:programId:${programId}`, categories, 60 * 15);
    return categories
  }

   async getCategoryById(id: string): Promise<Category> {
    const cache = await this.cache.get(`category:${id}`);
    if (cache) return cache as Category;

    const categories = await this.prisma.category.findUnique({
      where: {
        id
      }
    }) as Category;

    await this.cache.set(`category:${id}`, categories, 60 * 15);
    return categories
   }

}
