import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.js';
import { sendError } from '../utils/response.js';

export function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthenticated user', 401, 'UNAUTHORIZED');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
      return;
    }

    next();
  };
}
