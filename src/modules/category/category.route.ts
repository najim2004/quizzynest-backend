import { Router } from "express";
import { CategoryController } from "./category.controller";
import { authMiddleware } from "../../middleware/authMiddleware";
import { routeHandler } from "../../middleware/routeHandler";
import { upload } from "../../utils/multer";

class CategoryRoute {
  public router: Router;
  private categoryController: CategoryController;

  constructor() {
    this.router = Router();
    this.categoryController = new CategoryController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // সব ক্যাটাগরি ফেচ করা (পাবলিক)
    this.router.get(
      "/",
      routeHandler(
        this.categoryController.getAllCategories.bind(this.categoryController)
      )
    );

    // একটি ক্যাটাগরি ফেচ করা (পাবলিক)
    this.router.get(
      "/:id",
      routeHandler(
        this.categoryController.getCategoryById.bind(this.categoryController)
      )
    );

    this.router.post(
      "/",
      routeHandler(authMiddleware),
      upload.single("icon"), // 'icon' নামের ফিল্ড থেকে ফাইল নিবে
      routeHandler(
        this.categoryController.createCategory.bind(this.categoryController)
      )
    );

    // ক্যাটাগরি আপডেট করা (এখন ফাইল আপলোড সাপোর্ট করবে)
    this.router.put(
      "/:id",
      routeHandler(authMiddleware),
      upload.single("icon"), // 'icon' নামের ফিল্ড থেকে ফাইল নিবে
      routeHandler(
        this.categoryController.updateCategory.bind(this.categoryController)
      )
    );

    // ক্যাটাগরি ডিলিট করা (অথেনটিকেটেড)
    this.router.delete(
      "/:id",
      routeHandler(authMiddleware),
      routeHandler(
        this.categoryController.deleteCategory.bind(this.categoryController)
      )
    );

    // ইউজারের তৈরি ক্যাটাগরি ফেচ করা (অথেনটিকেটেড)
    this.router.get(
      "/user",
      routeHandler(authMiddleware),
      routeHandler(
        this.categoryController.getCategoriesByUser.bind(
          this.categoryController
        )
      )
    );
  }
}

export const categoryRoute = new CategoryRoute();
export const categoryRouter = categoryRoute.router;
