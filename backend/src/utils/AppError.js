/**
 * Operational error with an HTTP status code.
 *
 * The global error handler in server.js already reads `error.statusCode`
 * and `error.errors`, so throwing an AppError from any controller or
 * middleware produces a clean JSON response automatically.
 */
export default class AppError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors) {
    return new AppError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, message);
  }

  static forbidden(message = 'You are not allowed to perform this action') {
    return new AppError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(409, message);
  }

  static unprocessable(message, errors) {
    return new AppError(422, message, errors);
  }
}
