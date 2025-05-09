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

      return res.status(202).json({
        success: true,
        message: "Files uploaded successfully. Quiz generation started.",
        data: {
          jobId: result.jobId,
          status: "pending",
          fileCount: result.fileCount,
        },
      });
    } catch (error) {
      console.error("Error initiating quiz generation:", error);
      return res.status(500).json({
        success: false,
        message: `Failed to initiate quiz generation: ${
          (error as Error).message
        }`,
      });
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
      return res.status(200).json({ success: true, data: jobStatus });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  async getUserJobs(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }
      const userId = parseInt(req.user.sub);
      const jobs = await quizGenerationService.getUserJobs(userId);
      return res.status(200).json({ success: true, data: jobs });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch jobs: ${(error as Error).message}`,
      });
    }
  }
}

export const quizGenerationController = new QuizGenerationController();
