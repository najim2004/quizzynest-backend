import { Request, Response } from "express";
import { quizGenerationService } from "./quizgenerator.service";

export class QuizGenerationController {
  async initiateQuizGeneration(req: Request, res: Response): Promise<Response> {
    try {
      const files = req.files as Express.Multer.File[];
      const userId = (req.user as any).id;

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
      const { jobId } = req.params;
      const userId = (req.user as any).id;

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
      const userId = (req.user as any).id;
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
