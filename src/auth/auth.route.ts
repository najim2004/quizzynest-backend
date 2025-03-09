import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { routeHandler } from "../middleware/routeHandler";

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
      routeHandler(this.authController.signUp.bind(this.authController))
    );

    // Login user
    this.router.post(
      "/login",
      routeHandler(this.authController.signIn.bind(this.authController))
    );

    // Refresh token
    this.router.post(
      "/refresh-token",
      routeHandler(this.authController.refreshToken.bind(this.authController))
    );

    // Get current user profile
    this.router.get(
      "/me",
      routeHandler(authMiddleware),
      routeHandler(this.authController.getMe.bind(this.authController))
    );

    // Logout user
    // this.router.post(
    //   '/logout',
    //   authMiddleware,
    //   routeHandler(this.authController.logout.bind(this.authController))
    // );
  }
}

export const authRoute = new AuthRoute();
export const authRouter = authRoute.router;
