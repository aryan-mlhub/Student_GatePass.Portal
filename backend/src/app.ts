import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { authRouter } from './routes/authRoutes.js';
import { studentRouter } from './routes/studentRoutes.js';
import { passRouter } from './routes/passRoutes.js';
import { timetableRouter } from './routes/timetableRoutes.js';
import { gateRouter } from './routes/gateRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';

import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess, sendError } from './utils/response.js';

export function createApp(): Express {
  const app = express();

  // Standard production security & logging middlewares
  app.use(helmet());
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    const mongoState = mongoose.connection.readyState;
    const isDbConnected = mongoState === 1;

    sendSuccess(
      res,
      {
        service: 'GATEGUARD Campus Gate Pass Engine',
        status: isDbConnected ? 'UP' : 'DEGRADED',
        database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
        timestamp: new Date(),
      },
      isDbConnected ? 200 : 503
    );
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/student', studentRouter);
  app.use('/api/passes', passRouter);
  app.use('/api/timetable', timetableRouter);
  app.use('/api/gate', gateRouter);
  app.use('/api/admin', adminRouter);

  // 404 Route Handler
  app.use((req: Request, res: Response) => {
    sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
