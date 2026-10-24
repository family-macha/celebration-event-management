import { z } from 'zod';

/**
 * Environment configuration, parsed once and validated strictly so a typo
 * fails loudly at first use instead of misbehaving quietly.
 */
const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
  // Restricting the shape keeps odd values out of the SDK's request path.
  GEMINI_MODEL: z
    .string()
    .regex(/^gemini-[a-z0-9][a-z0-9.-]{0,62}$/, 'must look like "gemini-3.8-flash"')
    .default('gemini-3.8-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30_000).default(12_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3_600_000).default(60_000),
});

export interface AppConfig {
  readonly geminiApiKey: string | undefined;
  readonly geminiModel: string;
  readonly geminiTimeoutMs: number;
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
}

const KEYS = [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GEMINI_TIMEOUT_MS',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_WINDOW_MS',
] as const;

export class ConfigError extends Error {
  constructor(readonly invalidKeys: readonly string[]) {
    // Names only: values may be secrets.
    super(`Invalid environment configuration: ${invalidKeys.join(', ')}`);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env: Readonly<Record<string, string | undefined>>): AppConfig {
  // An empty value (e.g. `GEMINI_API_KEY=` copied from .env.example) means "unset".
  const present = Object.fromEntries(
    KEYS.flatMap((key) => {
      const value = env[key]?.trim();
      return value ? [[key, value]] : [];
    }),
  );

  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    const invalid = parsed.error.issues.map((issue) => String(issue.path[0] ?? 'unknown'));
    throw new ConfigError([...new Set(invalid)]);
  }

  return {
    geminiApiKey: parsed.data.GEMINI_API_KEY,
    geminiModel: parsed.data.GEMINI_MODEL,
    geminiTimeoutMs: parsed.data.GEMINI_TIMEOUT_MS,
    rateLimitMax: parsed.data.RATE_LIMIT_MAX,
    rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
  };
}
