import { createGeminiTextGenerator } from '@/lib/ai/geminiClient';
import { createIdeasService } from '@/lib/ai/ideasService';
import { createRateLimiter } from '@/lib/security/rateLimit';

import { ConfigError, loadConfig } from './config';
import { consoleLogger } from './logger';
import type { PlanHandlerDeps } from './planHandler';

let cached: PlanHandlerDeps | undefined;

/**
 * Wires the production dependencies on first use and reuses them afterwards
 * (one SDK client and one rate-limit table per server instance).
 *
 * Construction is lazy on purpose: `next build` imports route modules, and
 * building must not require secrets or touch the network.
 */
export function getPlanHandlerDeps(): PlanHandlerDeps {
  cached ??= createDeps();
  return cached;
}

/**
 * Operators need to know *which* setting is wrong; clients never do. The log
 * names the setting and never its value, since values may be secrets.
 */
function readConfig() {
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      consoleLogger.error('config.invalid', { settings: error.invalidKeys.join(',') });
    }
    throw error;
  }
}

function createDeps(): PlanHandlerDeps {
  const config = readConfig();

  return {
    rateLimiter: createRateLimiter({
      max: config.rateLimitMax,
      windowMs: config.rateLimitWindowMs,
    }),
    ideas: createIdeasService({
      generateText: config.geminiApiKey
        ? createGeminiTextGenerator({ apiKey: config.geminiApiKey, model: config.geminiModel })
        : null,
      timeoutMs: config.geminiTimeoutMs,
      logger: consoleLogger,
    }),
    logger: consoleLogger,
    now: () => new Date(),
  };
}
