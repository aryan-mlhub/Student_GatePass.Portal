import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(
        `[GATEGUARD Engine] Server running on port ${env.PORT} (${env.NODE_ENV} mode)`
      );
      logger.info(`[GATEGUARD Engine] Health Check: http://localhost:${env.PORT}/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('[Server] HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err: any) {
    logger.error('[Server Startup Error]', err.message);
    process.exit(1);
  }
}

startServer();

