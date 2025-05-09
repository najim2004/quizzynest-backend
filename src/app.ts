import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { connectDB } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { authRouter } from "./modules/auth/auth.route";
import { profileRouter } from "./modules/profile/profile.route";
import { quizRouter } from "./modules/quiz/quiz.route";
import { categoryRouter } from "./modules/category/category.route";
import path from "path";
import { quizGenerationRouter } from "./modules/quizgenerator/quiz-generation.route";
import { cleanupTempDirectory } from "./utils/cleanup.util";

class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeShutdownHandlers();
  }

  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(helmet());
    this.app.use(cookieParser());
    this.app.use(
      cors({
        origin: ["http://localhost:3000"],
        credentials: true,
      })
    );

    // Request parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Compression and logging
    this.app.use(compression());
    this.app.use(morgan("dev"));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    });
    this.app.use(limiter);
    this.app.use(
      "/uploads",
      express.static(path.join(__dirname, "../uploads"))
    );
  }

  private initializeRoutes(): void {
    this.app.get("/", (_, res) => {
      res.send(
        "<div style='display:flex; height:100%; width:100%; justify-content:center; align-items:center; background-color:#f1f1f1'><h1 style='text-align:center;'>Welcome to the QuizzyNest server</h1></div>"
      );
    });

    this.app.use("/api/auth", authRouter);
    this.app.use("/api/users", profileRouter);
    this.app.use("/api/quizzes", quizRouter);
    this.app.use("/api/quiz-generation", quizGenerationRouter);
    this.app.use("/api/categories", categoryRouter);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  private initializeShutdownHandlers(): void {
    // Handle graceful shutdown
    const cleanupAndExit = () => {
      console.log('[Server] Cleaning up before shutdown...');
      cleanupTempDirectory();
      process.exit(0);
    };

    // Handle different termination signals
    process.on('SIGTERM', cleanupAndExit);
    process.on('SIGINT', cleanupAndExit);
  }

  public async start(port: number): Promise<void> {
    try {
      await connectDB();
      // Clean up temp directory on server start
      cleanupTempDirectory();
      
      this.app.listen(port, () => {
        console.log(`[Server] Running on : http://localhost:${port}`);
        console.log(`[Environment] ${process.env.NODE_ENV}`);
      });
    } catch (error) {
      console.error("[Server] Failed to start:", error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

export default new App();
