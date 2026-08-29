import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/gateguard'),
  JWT_SECRET: z.string().default('gateguard_super_secret_jwt_key_2026_change_in_production'),
  QR_SECRET: z.string().default('gateguard_dedicated_qr_signing_secret_key_2026'),
  CAMPUS_LATITUDE: z.string().default('21.2227').transform((val) => parseFloat(val)),
  CAMPUS_LONGITUDE: z.string().default('79.0494').transform((val) => parseFloat(val)),
  CAMPUS_RADIUS_METERS: z.string().default('200').transform((val) => parseFloat(val)),
  QR_EXPIRY_MINUTES: z.string().default('30').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
