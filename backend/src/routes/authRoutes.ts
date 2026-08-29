import { Router } from 'express';
import { AuthController, registerSchema, loginSchema } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), AuthController.register);
authRouter.post('/login', validate(loginSchema), AuthController.login);
authRouter.get('/me', authenticate, AuthController.getMe);
