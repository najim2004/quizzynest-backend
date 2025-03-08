import { Router, Request, Response, RequestHandler } from "express";
import { AuthController } from "./auth.controller";
import { ApiResponse } from "../utils/api-response";

class AuthRoute {
  public router: Router;
  private authController: AuthController;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Register new user
    this.router.post(
      "/register",
      this.routeHandler(this.authController.signUp.bind(this.authController))
    );

    // Login user
    this.router.post(
      "/login",
      this.routeHandler(this.authController.signIn.bind(this.authController))
    );

    // Refresh token
    this.router.post(
      "/refresh-token",
      this.routeHandler(
        this.authController.refreshToken.bind(this.authController)
      )
    );

    // Get current user profile
    // this.router.get(
    //   '/me',
    //   authMiddleware,
    //   this.routeHandler(this.authController.getCurrentUser.bind(this.authController))
    // );

    // Logout user
    // this.router.post(
    //   '/logout',
    //   authMiddleware,
    //   this.routeHandler(this.authController.logout.bind(this.authController))
    // );
  }

  private routeHandler(
    fn: (req: Request, res: Response) => Promise<any>
  ): RequestHandler {
    return async (req: Request, res: Response) => {
      try {
        await fn(req, res);
      } catch (error) {
        ApiResponse.error(
          res,
          error instanceof Error ? error?.message : "Something went wrong",
          500
        );
      }
    };
  }
}

export const authRoute = new AuthRoute();
export const authRouter = authRoute.router;
