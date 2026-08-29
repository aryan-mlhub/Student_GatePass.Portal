import { Router } from 'express';
import {
  GateController,
  verifyQRSchema,
  exitSchema,
  entrySchema,
} from '../controllers/gateController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

export const gateRouter = Router();

// Guard terminal endpoints
gateRouter.use(authenticate);
gateRouter.use(authorizeRole('GUARD', 'ADMIN', 'WARDEN'));

gateRouter.post('/verify', validate(verifyQRSchema), GateController.verifyQR);
gateRouter.post('/exit', validate(exitSchema), GateController.recordExit);
gateRouter.post('/entry', validate(entrySchema), GateController.recordEntry);
