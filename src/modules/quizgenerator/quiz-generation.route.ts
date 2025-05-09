import { Router } from "express";
import { uploadFiles } from "../../middleware/upload.middleware";
import { authMiddleware } from "../../middleware/authMiddleware";
import { routeHandler } from "../../middleware/routeHandler";
import { quizGenerationController } from "./quizgenerator.controller";

class QuizGenerationRoute {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * @route POST /api/quizzes/generate
     * @desc Generate quizzes from uploaded files (images/PDFs)
     * @access Private
     */
    this.router.post(
      "/generate",
      routeHandler(authMiddleware),
      uploadFiles,
      routeHandler(
        quizGenerationController.initiateQuizGeneration.bind(
          quizGenerationController
        )
      )
    );

    /**
     * @route GET /api/quizzes/jobs/:jobId
     * @desc Check the status of a specific job
     * @access Private
     */
    this.router.get(
      "/jobs/:jobId",
      routeHandler(authMiddleware),
      routeHandler(
        quizGenerationController.checkJobStatus.bind(quizGenerationController)
      )
    );

    /**
     * @route GET /api/quizzes/jobs
     * @desc Get all jobs for the current user
     * @access Private
     */
    this.router.get(
      "/jobs",
      routeHandler(authMiddleware),
      routeHandler(
        quizGenerationController.getUserJobs.bind(quizGenerationController)
      )
    );
  }
}

export const quizGenerationRoute = new QuizGenerationRoute();
export const quizGenerationRouter = quizGenerationRoute.router;
