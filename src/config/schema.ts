import { z } from 'zod';

export const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_ALLOWED_USER_ID: z.coerce.number().int().positive(),
  OLLAMA_HOST: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2:3b'),
  DB_PATH: z.string().default('./data/tracker.db'),
  DOLLAR_API_URL: z
    .string()
    .url()
    .default('https://dolarapi.com/v1/dolares/bolsa'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),
});

export type Config = z.infer<typeof envSchema>;
