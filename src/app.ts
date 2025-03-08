import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import { connectDB } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { authRouter } from "./auth/auth.route";
class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(helmet());
    this.app.use(cors());

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
  }

  private initializeRoutes(): void {
    this.app.get("/", (_, res) => {
      res.send(
        "<div style='display:flex; height:100%; width:100%; justify-content:center; align-items:center; background-color:#f1f1f1'><h1 style='text-align:center;'>Welcome to the QuizzyNest server</h1></div>"
      );
    });

    this.app.use("/api/auth", authRouter);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(port: number): Promise<void> {
    try {
      await connectDB();
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
