import type { IdeasSource, PersonalisedIdeas, Plan, PlanRequest } from '@/lib/domain/types';
import type { Logger } from '@/lib/server/logger';

import { buildIdeasContext } from './context';
import { buildFallbackIdeas } from './fallbackIdeas';
import { GenerationError, type TextGenerator } from './geminiClient';
import { parseIdeas, personalisedIdeasJsonSchema } from './ideasSchema';
import { SYSTEM_INSTRUCTION, buildUserPrompt } from './prompt';

export interface IdeasResult {
  readonly ideas: PersonalisedIdeas;
  readonly source: IdeasSource;
}

export interface IdeasService {
  getIdeas(request: PlanRequest, plan: Plan): Promise<IdeasResult>;
}

interface IdeasServiceDeps {
  /** `null` when no API key is configured: the service then serves built-in ideas. */
  readonly generateText: TextGenerator | null;
  readonly timeoutMs: number;
  readonly logger: Logger;
}

/**
 * Produces personalised ideas, and *always* produces something.
 *
 * The model is an enhancement, not a dependency: a missing key, a timeout, a
 * refusal, malformed JSON or a schema violation all degrade to deterministic
 * built-in ideas, and the response says which one was used.
 */
export function createIdeasService(deps: IdeasServiceDeps): IdeasService {
  return {
    async getIdeas(request, plan) {
      const context = buildIdeasContext(request, plan);
      const { generateText } = deps;
      if (!generateText) {
        return { ideas: buildFallbackIdeas(context), source: 'fallback' };
      }

      try {
        const signal = AbortSignal.timeout(deps.timeoutMs);
        // Racing against the signal bounds the wait even if the SDK ignores it.
        const expired = new Promise<never>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              reject(signal.reason as Error);
            },
            { once: true },
          );
        });

        const rawText = await Promise.race([
          generateText({
            systemInstruction: SYSTEM_INSTRUCTION,
            prompt: buildUserPrompt(context),
            responseJsonSchema: personalisedIdeasJsonSchema,
            signal,
          }),
          expired,
        ]);

        return { ideas: parseIdeas(rawText), source: 'gemini' };
      } catch (error) {
        // Category only: never log the error message, which may echo request data.
        deps.logger.warn('ideas.fallback', { reason: classifyFailure(error) });
        return { ideas: buildFallbackIdeas(context), source: 'fallback' };
      }
    },
  };
}

function classifyFailure(error: unknown): string {
  if (error instanceof GenerationError) return error.reason;
  if (error instanceof SyntaxError) return 'invalid_json';
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'timeout';
    if (error.name === 'ZodError') return 'schema_mismatch';
  }
  return 'upstream_error';
}
