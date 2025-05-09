import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { ProfileService } from "./profile.service";

export class ProfileController {
  private profileService: ProfileService;
  
  constructor() {
    this.profileService = new ProfileService();
  }

  getUserStats = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      }
      const id = parseInt(req.user.sub);
      const userStats = await this.profileService.getUserStats(id);
      return ApiResponse.success(res, userStats);
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  getUserAchievements = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      }
      const id = parseInt(req.user.sub);
      const achievements = await this.profileService.getUserAchievements(id);
      return ApiResponse.success(res, achievements);
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  getUserPlayedQuizzes = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      }
      const id = parseInt(req.user.sub);
      const quizHistory = await this.profileService.getUserPlayedQuizzes(id);
      return ApiResponse.success(res, quizHistory);
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };
}
