import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/antigravity_db'),
  DB_MAX_CONNECTIONS: z.string().default('20').transform((val) => parseInt(val, 10)),
  DB_IDLE_TIMEOUT_MS: z.string().default('30000').transform((val) => parseInt(val, 10)),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_STREAM_KEY: z.string().default('gate_events_stream'),
  REDIS_CONSUMER_GROUP: z.string().default('gate_notifications_group'),
  REDIS_CONSUMER_NAME: z.string().default('worker_1'),
  REDIS_DLQ_STREAM_KEY: z.string().default('gate_events_dlq'),

  JWT_SECRET: z.string().default('antigravity_default_super_secret_jwt_signing_key_32_bytes_min'),
  JWT_EXPIRES_IN: z.string().default('90s'),
  QR_TOKEN_TTL_SECONDS: z.string().default('90').transform((val) => parseInt(val, 10)),

  CURFEW_START: z.string().default('21:00'),
  CURFEW_END: z.string().default('06:00'),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
});

export type Config = z.infer<typeof envSchema>;

export const config = envSchema.parse(process.env);
