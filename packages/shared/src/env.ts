import { z } from 'zod';

const PLACEHOLDER_PATTERN =
  /<[^>]*>|change[-_ ]?me|replace[-_ ]?me|your[-_ ]|placeholder/i;
const configuredString = z.string().trim().min(1);
const optionalServiceKey = z
  .string()
  .trim()
  .refine((value) => value === '' || !PLACEHOLDER_PATTERN.test(value));
const secret = z
  .string()
  .trim()
  .min(32)
  .refine((value) => !PLACEHOLDER_PATTERN.test(value));
const port = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(65_535));
const positiveInteger = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const nonNegativeDecimal = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().nonnegative());
const ttl = z.string().regex(/^[1-9]\d*(?:s|m|h|d)$/);
const urlWithProtocols = (protocols: readonly string[]) =>
  z
    .url()
    .refine((value) =>
      protocols.some((protocol) => value.startsWith(protocol)),
    );

// All keys must exist; blank service keys explicitly represent an unconfigured service.
export const envSchema = z
  .object({
    PUBLIC_BASE_PATH: z
      .string()
      .regex(/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/),
    PUBLIC_URL: urlWithProtocols(['https:', 'http:']),
    API_PORT: port,
    WEB_PORT: port,
    DATABASE_URL: urlWithProtocols(['postgres:', 'postgresql:']),
    REDIS_URL: urlWithProtocols(['redis:', 'rediss:']),
    JWT_SECRET: secret,
    JWT_ACCESS_TTL: ttl,
    JWT_REFRESH_TTL: ttl,
    SETUP_TOKEN: secret,
    RESEND_API_KEY: optionalServiceKey,
    EMAIL_FROM: z.email(),
    TURNSTILE_SITE_KEY: optionalServiceKey,
    TURNSTILE_SECRET_KEY: optionalServiceKey,
    SERVER_MODE: z.enum(['private', 'public', 'maintenance']),
    PROVIDER_EQUITY_PRIMARY: z.string().trim(),
    PROVIDER_EQUITY_FALLBACK: z.string().trim(),
    PROVIDER_CRYPTO: configuredString,
    EVDS_API_KEY: optionalServiceKey,
    KAP_API_KEY: optionalServiceKey,
    NEWS_FEEDS_FILE: configuredString,
    AI_PROVIDER: z.enum(['google', 'openai', 'anthropic', 'local']),
    AI_API_KEY: optionalServiceKey,
    AI_DAILY_REQUEST_CAP: positiveInteger,
    AI_MONTHLY_BUDGET_USD: nonNegativeDecimal,
    SENTRY_DSN: z.union([z.literal(''), urlWithProtocols(['https:', 'http:'])]),
    LOG_LEVEL: z.enum([
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal',
      'silent',
    ]),
  })
  .superRefine((value, context) => {
    if (value.AI_PROVIDER !== 'local' && value.AI_API_KEY === '') {
      context.addIssue({
        code: 'custom',
        path: ['AI_API_KEY'],
        message: 'required',
      });
    }
    if (
      Boolean(value.TURNSTILE_SITE_KEY) !== Boolean(value.TURNSTILE_SECRET_KEY)
    ) {
      context.addIssue({
        code: 'custom',
        path: [
          value.TURNSTILE_SITE_KEY
            ? 'TURNSTILE_SECRET_KEY'
            : 'TURNSTILE_SITE_KEY',
        ],
        message: 'required',
      });
    }
  });

export type Environment = z.infer<typeof envSchema>;

// Server entry points call this before opening a listener; importing shared stays pure.
export function parseEnv(input: unknown): Environment {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(
      `Ortam değişkenlerini düzeltin: ${fields.filter(Boolean).join(', ') || 'ortam nesnesi'}. .env.example dosyasındaki alanları kontrol edin.`,
    );
  }
  return result.data;
}
