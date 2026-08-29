import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        sendError(res, 'Request validation failed', 400, 'VALIDATION_ERROR', errorMessages);
        return;
      }
      sendError(res, 'Invalid request format', 400, 'BAD_REQUEST');
    }
  };
}
