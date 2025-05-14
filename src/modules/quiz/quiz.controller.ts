import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { QuizService } from "./quiz.service";
import { validateCreateQuiz, validateUpdateQuiz } from "./quiz.validator";
import { Difficulty, QuizStatus } from "@prisma/client";

export class QuizController {
  private quizService: QuizService;

  constructor() {
    this.quizService = new QuizService();
  }

  /**
   * Create a new quiz
   */
  createQuiz = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }

      const validationError = validateCreateQuiz(req.body);
      if (validationError) {
        return ApiResponse.badRequest(res, validationError);
      }

      const quiz = await this.quizService.createQuiz(
        parseInt(req.user.sub),
        req.body
      );

      if (!quiz) {
        return ApiResponse.badRequest(res, "Failed to create quiz");
      }

      return ApiResponse.created(res, quiz);
    } catch (error) {
      console.error("[Quiz Controller] Create quiz error:", error);
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  /**
   * Get quiz by ID
   */
  getQuizById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiResponse.badRequest(res, "Invalid quiz ID");
      }

      const quiz = await this.quizService.getQuizById(id);
      if (!quiz) {
        return ApiResponse.notFound(res, "Quiz not found");
      }

      return ApiResponse.success(res, quiz);
    } catch (error) {
      console.error("[Quiz Controller] Get quiz error:", error);
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  /**
   * Start a new quiz session
   */
  startQuizSession = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }

      const userId = parseInt(req.user.sub);
      const filters = {
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        difficulty: req.query.difficulty as Difficulty,
        categoryId: req.query.categoryId
          ? parseInt(req.query.categoryId as string)
          : undefined,
        sessionId: req.query.sessionId
          ? parseInt(req.query.sessionId as string)
          : undefined,
      };

      const result = await this.quizService.startQuizSession(userId, filters);
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error("[Quiz Controller] Get quizzes error:", error);
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  /**
   * Get filtered quizzes for admin
   */
  getQuizzesForAdmin = async (req: Request, res: Response) => {
    try {
      if (!req.user?.role || req.user.role !== "ADMIN") {
        return ApiResponse.forbidden(res, "Admin access required");
      }
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        difficulty: req.query.difficulty as Difficulty,
        categoryId: req.query.categoryId
          ? parseInt(req.query.categoryId as string)
          : undefined,
        search: req.query.search as string,
        createdBy: req.query.createdBy
          ? parseInt(req.query.createdBy as string)
          : undefined,
        status: req.query.status ? (req.query.status as QuizStatus) : undefined,
      };

      const result = await this.quizService.getQuizzesForAdmin(filters);
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error("[Quiz Controller] Get admin quizzes error:", error);
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  /**
   * Update quiz
   */
  updateQuiz = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiResponse.badRequest(res, "Invalid quiz ID");
      }

      const validationError = validateUpdateQuiz(req.body);
      if (validationError) {
        return ApiResponse.badRequest(res, validationError);
      }

      const quiz = await this.quizService.updateQuiz(
        id,
        parseInt(req.user.sub),
        req.body
      );

      if (!quiz) {
        return ApiResponse.notFound(res, "Quiz not found or unauthorized");
      }

      return ApiResponse.success(res, quiz);
    } catch (error) {
      console.error("[Quiz Controller] Update quiz error:", error);
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  /**
   * Delete quiz
   */
  deleteQuiz = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiResponse.badRequest(res, "Invalid quiz ID");
      }

      const success = await this.quizService.deleteQuiz(
        id,
        parseInt(req.user.sub)
      );
      if (!success) {
        return ApiResponse.notFound(res, "Quiz not found or unauthorized");
      }

      return ApiResponse.success(res, null, "Quiz deleted successfully");
    } catch (error) {
      console.error("[Quiz Controller] Delete quiz error:", error);
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };

  /**
   * Submit quiz answer
   */
  submitAnswer = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "Unauthorized access");
      }

      const { quizId, answerId, sessionId, encryptedStartTime } = req?.body;
      if (!quizId || !sessionId || !encryptedStartTime) {
        return ApiResponse.badRequest(res, "Invalid submission!");
      }
      const correctAnswerId: number | null = parseInt(answerId)
        ? parseInt(answerId)
        : null;
      const result = await this.quizService.submitQuizAnswer(
        parseInt(req.user.sub),
        parseInt(sessionId),
        parseInt(quizId),
        correctAnswerId,
        encryptedStartTime
      );

      if (!result) {
        return ApiResponse.badRequest(
          res,
          "Invalid submission or already answered"
        );
      }

      return ApiResponse.success(res, result);
    } catch (error) {
      console.error("[Quiz Controller] Submit answer error:", error);
      return ApiResponse.error(
        res,
        error instanceof Error ? error.message : "Internal Server Error",
        500
      );
    }
  };
}
