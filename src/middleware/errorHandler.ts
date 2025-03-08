import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export class AppError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  console.error("[Error]", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
