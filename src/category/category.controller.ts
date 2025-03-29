import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import { CategoryService } from "./category.service";
import { CreateCategoryInput, UpdateCategoryInput } from "./category.type";

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getAllCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.categoryService.getAllCategories();
      return ApiResponse.success(res, categories);
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  getCategoryById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const category = await this.categoryService.getCategoryById(id);
      return ApiResponse.success(res, category);
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  createCategory = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      }

      const userId = parseInt(req.user.sub);
      const input: CreateCategoryInput = req.body;
      const file = req.file;
      const category = await this.categoryService.createCategory(userId, input, file);
      return ApiResponse.success(
        res,
        category,
        "Category created successfully",
        201
      );
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  updateCategory = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      }

      const id = parseInt(req.params.id);
      const input: UpdateCategoryInput = req.body;
      const file = req.file;

      const category = await this.categoryService.updateCategory(id, input, file);
      return ApiResponse.success(
        res,
        category,
        "Category updated successfully"
      );
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  deleteCategory = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      }
      const id = parseInt(req.params.id);
      await this.categoryService.deleteCategory(id);
      return ApiResponse.success(res, null, "Category deleted successfully");
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  getCategoriesByUser = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      }
      const userId = parseInt(req.user.sub);
      const categories = await this.categoryService.getCategoriesByUser(userId);
      return ApiResponse.success(res, categories);
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };
}
