import { Response } from "express";

/**
 * Standard API response structure
 * @template T - Type of the data payload
 */
interface IApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * HTTP Status codes enum for better type safety and maintainability
 */
enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Utility class for standardized API response handling
 */
export class ApiResponse {
  /**
   * Creates a success response
   * @param res - Express Response object
   * @param data - The payload to be sent
   * @param message - Success message
   * @param statusCode - HTTP status code
   */
  static success<T>(
    res: Response,
    data: T,
    message = "Operation successful",
    statusCode = HttpStatus.OK
  ): Response<IApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Creates an error response
   * @param res - Express Response object
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param error - Detailed error information
   */
  static error(
    res: Response,
    message: string,
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    error?: string
  ): Response<IApiResponse<null>> {
    const errorResponse: IApiResponse<null> = {
      success: false,
      message,
      error: error || message,
    };
    return res.status(statusCode).json(errorResponse);
  }

  /**
   * Creates a 404 Not Found response
   */
  static notFound(
    res: Response,
    message = "The requested resource was not found"
  ): Response<IApiResponse<null>> {
    return this.error(res, message, HttpStatus.NOT_FOUND);
  }

  /**
   * Creates a 400 Bad Request response
   */
  static badRequest(
    res: Response,
    message = "Invalid request parameters"
  ): Response<IApiResponse<null>> {
    return this.error(res, message, HttpStatus.BAD_REQUEST);
  }

  /**
   * Creates a 401 Unauthorized response
   */
  static unauthorized(
    res: Response,
    message = "Authentication required"
  ): Response<IApiResponse<null>> {
    return this.error(res, message, HttpStatus.UNAUTHORIZED);
  }

  /**
   * Creates a 403 Forbidden response
   */
  static forbidden(
    res: Response,
    message = "Access denied"
  ): Response<IApiResponse<null>> {
    return this.error(res, message, HttpStatus.FORBIDDEN);
  }

  /**
   * Creates a 409 Conflict response
   */
  static conflict(
    res: Response,
    message = "Resource conflict detected"
  ): Response<IApiResponse<null>> {
    return this.error(res, message, HttpStatus.CONFLICT);
  }

  /**
   * Creates a 422 Unprocessable Entity response
   */
  static unprocessableEntity(
    res: Response,
    message = "Unable to process the request"
  ): Response<IApiResponse<null>> {
    return this.error(res, message, HttpStatus.UNPROCESSABLE_ENTITY);
  }

  /**
   * Creates a 201 Created success response
   */
  static created<T>(
    res: Response,
    data: T,
    message = "Resource created successfully"
  ): Response<IApiResponse<T>> {
    return this.success(res, data, message, HttpStatus.CREATED);
  }

  /**
   * Creates a 204 No Content success response
   */
  static noContent(
    res: Response,
    message = "No content available"
  ): Response<IApiResponse<null>> {
    return this.success(res, null, message, HttpStatus.NO_CONTENT);
  }

  /**
   * Creates a 500 Internal Server Error response
   */
  static serverError(
    res: Response,
    message = "Internal server error occurred"
  ): Response<IApiResponse<null>> {
    return this.error(res, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
