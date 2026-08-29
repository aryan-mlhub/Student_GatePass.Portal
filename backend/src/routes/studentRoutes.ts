import { Router } from 'express';
import { StudentController } from '../controllers/studentController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorize.js';

export const studentRouter = Router();

// Student-accessible routes (require STUDENT role or higher)
studentRouter.use(authenticate);

studentRouter.get('/current-status', StudentController.getCurrentStatus);
studentRouter.get('/timetable', StudentController.getMyTimetable);
studentRouter.get('/passes', StudentController.getMyPasses);
studentRouter.get('/notifications', StudentController.getMyNotifications);
