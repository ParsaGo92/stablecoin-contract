import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  ADMIN_ID: z.string().min(1, 'ADMIN_ID is required'),
  MIN_DEPOSIT_USD: z.coerce.number().positive().default(10),
  MAX_DEPOSIT_USD: z.coerce.number().positive().default(1000),
  NOWPAYMENTS_API_KEY: z.string().optional(),
  NOWPAYMENTS_API_URL: z.string().url().default('https://api.nowpayments.io/v1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.format();
  throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted, null, 2)}`);
}

export const config = {
  botToken: parsed.data.BOT_TOKEN,
  mongoUri: parsed.data.MONGODB_URI,
  adminId: parsed.data.ADMIN_ID,
  minDepositUsd: parsed.data.MIN_DEPOSIT_USD,
  maxDepositUsd: parsed.data.MAX_DEPOSIT_USD,
  nowPaymentsApiKey: parsed.data.NOWPAYMENTS_API_KEY,
  nowPaymentsBaseUrl: parsed.data.NOWPAYMENTS_API_URL,
};
