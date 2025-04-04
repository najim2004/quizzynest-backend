import { Router } from "express";
import { QuizController } from "./quiz.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { routeHandler } from "../middleware/routeHandler";

class QuizRoute {
  public router: Router;
  private quizController: QuizController;

  constructor() {
    this.router = Router();
    this.quizController = new QuizController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes (no auth required)
    this.router.get(
      "/quiz/:id",
      routeHandler(this.quizController.getQuizById.bind(this.quizController))
    );

    // User routes (auth required)
    this.router.get(
      "/start",
      routeHandler(authMiddleware),
      routeHandler(
        this.quizController.startQuizSession.bind(this.quizController)
      )
    );

    this.router.post(
      "/admin",
      routeHandler(authMiddleware),
      routeHandler(this.quizController.createQuiz.bind(this.quizController))
    );

    this.router.post(
      "/submit",
      routeHandler(authMiddleware),
      routeHandler(this.quizController.submitAnswer.bind(this.quizController))
    );

    this.router.put(
      "/admin/:id",
      routeHandler(authMiddleware),
      routeHandler(this.quizController.updateQuiz.bind(this.quizController))
    );

    this.router.delete(
      "/admin/:id",
      routeHandler(authMiddleware),
      routeHandler(this.quizController.deleteQuiz.bind(this.quizController))
    );

    // Admin routes
    this.router.get(
      "/admin",
      routeHandler(authMiddleware),
      routeHandler(
        this.quizController.getQuizzesForAdmin.bind(this.quizController)
      )
    );
  }
}

export const quizRoute = new QuizRoute();
export const quizRouter = quizRoute.router;
