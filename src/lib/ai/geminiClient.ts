import { FinishReason, GoogleGenAI } from '@google/genai';

/**
 * The only module that talks to the Gemini SDK. Everything else depends on the
 * small `TextGenerator` function type, so the rest of the app is testable
 * without the network and the provider is swappable in one place.
 */

export interface TextGenerationRequest {
  readonly systemInstruction: string;
  readonly prompt: string;
  readonly responseJsonSchema: unknown;
  readonly signal: AbortSignal;
}

export type TextGenerator = (request: TextGenerationRequest) => Promise<string>;

export class GenerationError extends Error {
  constructor(readonly reason: 'empty_response' | 'incomplete_response') {
    super(reason);
    this.name = 'GenerationError';
  }
}

interface GeminiOptions {
  readonly apiKey: string;
  readonly model: string;
  /** Upper bound on generated tokens; caps cost per request. */
  readonly maxOutputTokens?: number;
}

const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

export function createGeminiTextGenerator(options: GeminiOptions): TextGenerator {
  const client = new GoogleGenAI({ apiKey: options.apiKey });

  return async ({ systemInstruction, prompt, responseJsonSchema, signal }) => {
    const response = await client.models.generateContent({
      model: options.model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema,
        maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        abortSignal: signal,
        // The SDK retries up to 5 times with backoff by default. That would
        // outlast our timeout and multiply cost during an outage, so fail
        // fast and let the caller fall back to built-in ideas instead.
        httpOptions: { retryOptions: { attempts: 1 } },
      },
    });

    const text = response.text;
    if (!text) throw new GenerationError('empty_response');

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason !== undefined && finishReason !== FinishReason.STOP) {
      throw new GenerationError('incomplete_response');
    }
    return text;
  };
}
