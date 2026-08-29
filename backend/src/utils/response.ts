import { Response } from 'express';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: any;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): Response {
  const body: SuccessResponse<T> = {
    success: true,
    data,
  };
  if (message) {
    body.message = message;
  }
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: any
): Response {
  const body: ErrorResponse = {
    success: false,
    message,
  };
  if (code) {
    body.code = code;
  }
  if (details) {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}
