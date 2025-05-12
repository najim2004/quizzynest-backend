import { Request, Response } from "express";
import { quizGenerationService } from "./quizgenerator.service";
import { ApiResponse } from "../../utils/apiResponse";

export class QuizGenerationController {
  async initiateQuizGeneration(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }
      const files = req.files as Express.Multer.File[];
      const userId = parseInt(req.user.sub);

      const result = await quizGenerationService.initiateQuizGeneration(
        files,
        userId
      );

      return ApiResponse.success(
        res,
        {
          jobId: result.jobId,
          status: "pending",
          fileCount: result.fileCount,
        },
        "Quiz generation initiated successfully",
        202
      );
    } catch (error) {
      console.error("Error initiating quiz generation:", error);

      return ApiResponse.error(
        res,
        `Failed to initiate quiz generation`,
        500,
        (error as Error).message
      );
    }
  }

  async checkJobStatus(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }
      const { jobId } = req.params;
      const userId = parseInt(req.user.sub);

      const jobStatus = await quizGenerationService.checkJobStatus(
        jobId,
        userId
      );
      return ApiResponse.success(
        res,
        jobStatus,
        "Job status fetched successfully",
        200
      );
    } catch (error) {
      return ApiResponse.error(
        res,
        `Failed to fetch job status`,
        500,
        (error as Error).message
      );
    }
  }

  async getUserJobs(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }
      const userId = parseInt(req.user.sub);
      const jobs = await quizGenerationService.getUserJobs(userId);
      return ApiResponse.success(
        res,
        jobs,
        "User jobs fetched successfully",
        200
      );
    } catch (error) {
      return ApiResponse.error(
        res,
        `Failed to fetch user jobs`,
        500,
        (error as Error).message
      );
    }
  }
}

export const quizGenerationController = new QuizGenerationController();
