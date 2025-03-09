import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { SignInBody, SignUpBody } from "./auth.types";
import { ApiResponse } from "../utils/apiResponse";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  signUp = async (req: Request, res: Response) => {
    try {
      const { email, password, fullName } = req?.body as SignUpBody;

      // Basic validation
      if (!email || !password || !fullName)
        return ApiResponse.badRequest(
          res,
          "Email, password and full name are required"
        );

      const isUserCreated = await this.authService.signUp({
        email,
        password,
        fullName,
      });

      if (isUserCreated) {
        return ApiResponse.success(res, null, "User created successfully");
      }
    } catch (error) {
      return ApiResponse.error(
        res,
        error instanceof Error ? error?.message : "Sign up failed",
        500
      );
    }
  };

  signIn = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as SignInBody;

      if (!email || !password)
        return ApiResponse.badRequest(res, "Email and password are required");

      const tokens = await this.authService.signIn({ email, password });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return ApiResponse.success(
        res,
        {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
        },
        "Signed in successfully",
        200
      );
    } catch (error) {
      return ApiResponse.unauthorized(
        res,
        error instanceof Error ? error?.message : "Sign in failed"
      );
    }
  };

  signOut = async (_req: Request, res: Response) => {
    res.clearCookie("refreshToken");
    return ApiResponse.success(res, "Signed out successfully");
  };

  refreshToken = async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken)
        return ApiResponse.notFound(res, "Refresh token not found");

      const tokens = await this.authService.refreshTokens(refreshToken);

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return ApiResponse.success(
        res,
        {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
        },
        "Token refreshed successfully"
      );
    } catch (error) {
      return ApiResponse.unauthorized(
        res,
        error instanceof Error ? error?.message : "Refresh token failed"
      );
    }
  };

  getMe = async (req: Request, res: Response) => {
    try {
      if (!req?.user)
        return ApiResponse.unauthorized(res, "Unauthorized Detected");
      const id = parseInt(req?.user?.sub);
      const user = await this.authService.getMe(id);
      return ApiResponse.success(res, user);
    } catch (error) {
      return ApiResponse.unauthorized(
        res,
        error instanceof Error ? error?.message : "Get me failed"
      );
    }
  };
}
