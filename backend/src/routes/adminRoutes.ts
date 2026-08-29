import { Router } from 'express';
import {
  AdminController,
  rejectPassSchema,
  updateCampusConfigSchema,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(authorizeRole('ADMIN', 'WARDEN'));

// Warden & Admin pass review routes
adminRouter.get('/passes/pending', AdminController.getPendingPasses);
adminRouter.post('/passes/:id/approve', AdminController.approvePass);
adminRouter.post('/passes/:id/reject', validate(rejectPassSchema), AdminController.rejectPass);

// Dashboard & Logs
adminRouter.get('/dashboard', AdminController.getDashboardAnalytics);
adminRouter.get('/gate-logs', AdminController.getGateLogs);

// Geofence Config
adminRouter.get('/campus-config', AdminController.getCampusConfig);
adminRouter.put(
  '/campus-config',
  authorizeRole('ADMIN'),
  validate(updateCampusConfigSchema),
  AdminController.updateCampusConfig
);
