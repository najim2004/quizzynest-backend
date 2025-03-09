import { Request, Response, NextFunction, RequestHandler } from "express";
import { ApiResponse } from "../utils/apiResponse";

export const routeHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error: unknown) {
      // Handle known errors
      if (error instanceof Error) {
        ApiResponse.error(res, error.message, 500);
      }
      // Handle unknown errors
      else {
        ApiResponse.error(res, "Internal Server Error", 500);
      }

      // Pass error to Express error handling middleware
      next(error);
    }
  };
};
