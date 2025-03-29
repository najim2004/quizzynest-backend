import { PrismaClient } from "@prisma/client";
import { prisma } from "../config/database";
import {
  CategoryWithQuizCount,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.type";
import { ImageManager } from "../utils/imageManager";
import fs from "fs";

export class CategoryService {
  private prisma: PrismaClient;
  private imageManager: ImageManager;

  constructor() {
    this.prisma = prisma;
    this.imageManager = new ImageManager();
  }

  // সব ক্যাটাগরি ফেচ করা
  getAllCategories = async (): Promise<CategoryWithQuizCount[]> => {
    try {
      return await this.prisma.category.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { quizzes: true },
          },
        },
      });
    } catch (error) {
      console.error("[Category] Failed to fetch categories:", error);
      throw new Error("Failed to fetch categories");
    }
  };

  // একটি নির্দিষ্ট ক্যাটাগরি ফেচ করা
  getCategoryById = async (
    id: number
  ): Promise<CategoryWithQuizCount | null> => {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { quizzes: true },
          },
        },
      });
      if (!category) {
        throw new Error("Category not found");
      }
      return category;
    } catch (error) {
      console.error("[Category] Failed to fetch category:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch category");
    }
  };

  // নতুন ক্যাটাগরি তৈরি করা
  async createCategory(
    userId: number,
    input: CreateCategoryInput,
    file?: Express.Multer.File
  ): Promise<CategoryWithQuizCount> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        let categoryData: any = {
          ...input,
          createdBy: userId,
        };

        if (file) {
          try {
            const uploadResult = await this.imageManager.uploadImage(file.path);
            categoryData.icon = uploadResult.url;
            categoryData.iconId = uploadResult.public_id;
          } finally {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }

        return await tx.category.create({
          data: categoryData,
          include: {
            _count: {
              select: { quizzes: true },
            },
          },
        });
      });
    } catch (error) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  // ক্যাটাগরি আপডেট করা
  async updateCategory(
    id: number,
    input: UpdateCategoryInput,
    file?: Express.Multer.File
  ): Promise<CategoryWithQuizCount> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const oldCategory = await tx.category.findUnique({ where: { id } });
        if (!oldCategory) {
          throw new Error("Category not found");
        }

        if (file) {
          try {
            const uploadResult = await this.imageManager.updateImage(
              file.path,
              oldCategory?.iconId || ""
            );
            input.icon = uploadResult.url;
            input.iconId = uploadResult.public_id;
          } finally {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }

        return await tx.category.update({
          where: { id },
          data: input,
          include: {
            _count: {
              select: { quizzes: true },
            },
          },
        });
      });
    } catch (error) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  // ক্যাটাগরি ডিলিট করা
  deleteCategory = async (id: number): Promise<void> => {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
      });
      if (!category) {
        throw new Error("Category not found");
      }

      await this.prisma.category.delete({
        where: { id },
      });
    } catch (error) {
      console.error("[Category] Failed to delete category:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to delete category");
    }
  };

  // ইউজারের তৈরি ক্যাটাগরি ফেচ করা
  getCategoriesByUser = async (
    userId: number
  ): Promise<CategoryWithQuizCount[]> => {
    try {
      return await this.prisma.category.findMany({
        where: { createdBy: userId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { quizzes: true },
          },
        },
      });
    } catch (error) {
      console.error("[Category] Failed to fetch user categories:", error);
      throw new Error("Failed to fetch user categories");
    }
  };
}
