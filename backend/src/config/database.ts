import mongoose from 'mongoose';
import { env } from './env.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(uri?: string): Promise<typeof mongoose> {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const mongoUri = uri || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected to database: ${conn.connection.name}`);
    return conn;
  } catch (err: any) {
    console.warn(`[MongoDB Warning] Local MongoDB (${mongoUri}) unavailable: ${err.message}`);
    console.log('[MongoDB] Initializing In-Memory Mongo Server for standalone zero-config execution...');

    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create();
    }

    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`[MongoDB] In-Memory Mongo Server connected successfully at ${memoryUri}`);

    // Auto-seed in-memory database
    try {
      const { seedDatabase } = await import('../seed/seedDatabase.js');
      await seedDatabase();
    } catch (seedErr: any) {
      console.warn('[MongoDB Auto-Seed Warning]', seedErr.message);
    }

    return conn;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    console.log('[MongoDB] Disconnected from database.');
  } catch (err: any) {
    console.error('[MongoDB Error] Disconnect error:', err.message);
  }
}
