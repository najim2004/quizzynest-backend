import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { routeHandler } from "../middleware/routeHandler";

class ProfileRoute {
  public router: Router;
  private profileController: ProfileController;

  constructor() {
    this.router = Router();
    this.profileController = new ProfileController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Get user statistics
    this.router.get(
      "/stats",
      routeHandler(authMiddleware),
      routeHandler(
        this.profileController.getUserStats.bind(this.profileController)
      )
    );

    // Get user achievements
    this.router.get(
      "/achievements",
      routeHandler(authMiddleware),
      routeHandler(
        this.profileController.getUserAchievements.bind(this.profileController)
      )
    );

    // Get user's played quiz history
    this.router.get(
      "/quiz-history",
      routeHandler(authMiddleware),
      routeHandler(
        this.profileController.getUserPlayedQuizzes.bind(this.profileController)
      )
    );
  }
}

export const profileRoute = new ProfileRoute();
export const profileRouter = profileRoute.router;
