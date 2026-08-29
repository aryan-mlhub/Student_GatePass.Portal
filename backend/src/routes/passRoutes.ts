import { Router } from 'express';
import { PassController, requestPassSchema } from '../controllers/passController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

export const passRouter = Router();

passRouter.use(authenticate);

passRouter.post('/request', validate(requestPassSchema), PassController.requestPass);
passRouter.get('/:id', PassController.getPassById);
passRouter.get('/:id/qr', PassController.getPassQR);
