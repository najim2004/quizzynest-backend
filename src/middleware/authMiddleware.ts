import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayloadInput } from "../modules/auth/auth.types";
import { ApiResponse } from "../utils/apiResponse";
import "dotenv";

const TOKENS = {
  ACCESS: { secret: process.env.JWT_ACCESS_SECRET as string, expiry: "900" },
  REFRESH: {
    secret: process.env.JWT_REFRESH_SECRET as string,
    expiry: "2592000",
  },
} as const;

const generateToken = (payload: JwtPayloadInput, type: keyof typeof TOKENS) =>
  jwt.sign(payload, TOKENS[type].secret, { expiresIn: TOKENS[type].expiry });

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const accessToken = req.headers?.authorization?.split(" ")[1];
    if (!accessToken) return ApiResponse.unauthorized(res, "No access token");

    try {
      const decoded = jwt.verify(
        accessToken,
        TOKENS.ACCESS.secret
      ) as JwtPayloadInput;
      req.user = decoded;
      return next();
    } catch {
      const refreshToken = req?.cookies?.refreshToken;
      if (!refreshToken) {
        res.clearCookie("refreshToken");
        return ApiResponse.unauthorized(res, "No refresh token");
      }

      try {
        const decoded = jwt.verify(
          refreshToken,
          TOKENS.REFRESH.secret
        ) as JwtPayloadInput;
        const newAccessToken = generateToken(decoded, "ACCESS");
        const newRefreshToken = generateToken(decoded, "REFRESH");

        res.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.setHeader("Authorization", `Bearer ${newAccessToken}`);

        req.user = decoded;
        return next();
      } catch {
        res.clearCookie("refreshToken");
        return ApiResponse.unauthorized(res, "Invalid refresh token");
      }
    }
  } catch (error) {
    return ApiResponse.error(res, "Internal server error", 500);
  }
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadInput;
    }
  }
}
