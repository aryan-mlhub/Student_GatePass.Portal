import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`[Error] ${req.method} ${req.originalUrl} - ${err.message}`, err.stack);

  if (err.name === 'ValidationError') {
    sendError(res, err.message, 400, 'MONGOOSE_VALIDATION_ERROR');
    return;
  }

  if (err.code === 11000) {
    sendError(res, 'Duplicate key error in database', 409, 'DUPLICATE_KEY_ERROR', err.keyValue);
    return;
  }

  const statusCode = err.statusCode || (err.status >= 100 && err.status < 600 ? err.status : 500);
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  sendError(
    res,
    err.message || 'An unexpected internal server error occurred',
    statusCode,
    errorCode
  );
}
