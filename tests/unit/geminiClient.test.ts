import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  generateContent: vi.fn(),
  constructor: vi.fn(),
}));

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof GenAiModule>();
  class FakeGoogleGenAI {
    readonly models = { generateContent: sdk.generateContent };
    constructor(options: unknown) {
      sdk.constructor(options);
    }
  }
  return { ...actual, GoogleGenAI: FakeGoogleGenAI };
});

import { FinishReason } from '@google/genai';
import type * as GenAiModule from '@google/genai';

import { GenerationError, createGeminiTextGenerator } from '@/lib/ai/geminiClient';

const request = () => ({
  systemInstruction: 'be helpful',
  prompt: '<planning_request>{}</planning_request>',
  responseJsonSchema: { type: 'object' },
  signal: new AbortController().signal,
});

beforeEach(() => {
  sdk.generateContent.mockReset();
  sdk.constructor.mockReset();
});

describe('createGeminiTextGenerator', () => {
  it('creates the client with the key it was given and nothing else', () => {
    createGeminiTextGenerator({ apiKey: 'test-key', model: 'gemini-3.8-flash' });
    expect(sdk.constructor).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });

  it('asks for constrained JSON, bounded output, one attempt and a cancellable call', async () => {
    sdk.generateContent.mockResolvedValue({
      text: '{"ok":true}',
      candidates: [{ finishReason: FinishReason.STOP }],
    });
    const generate = createGeminiTextGenerator({ apiKey: 'k', model: 'gemini-3.8-flash' });
    const input = request();

    await expect(generate(input)).resolves.toBe('{"ok":true}');

    expect(sdk.generateContent).toHaveBeenCalledWith({
      model: 'gemini-3.8-flash',
      contents: input.prompt,
      config: {
        systemInstruction: 'be helpful',
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'object' },
        maxOutputTokens: 8192,
        abortSignal: input.signal,
        httpOptions: { retryOptions: { attempts: 1 } },
      },
    });
  });

  it('honours a custom output limit', async () => {
    sdk.generateContent.mockResolvedValue({ text: '{}', candidates: [] });
    const generate = createGeminiTextGenerator({ apiKey: 'k', model: 'm', maxOutputTokens: 512 });
    await generate(request());
    const config = (
      sdk.generateContent.mock.calls[0]?.[0] as { config: { maxOutputTokens: number } }
    ).config;
    expect(config.maxOutputTokens).toBe(512);
  });

  it('accepts a response with no finish reason reported', async () => {
    sdk.generateContent.mockResolvedValue({ text: '{}' });
    const generate = createGeminiTextGenerator({ apiKey: 'k', model: 'm' });
    await expect(generate(request())).resolves.toBe('{}');
  });

  it.each([undefined, ''])('rejects an empty response (%j)', async (text) => {
    sdk.generateContent.mockResolvedValue({ text, candidates: [] });
    const generate = createGeminiTextGenerator({ apiKey: 'k', model: 'm' });
    await expect(generate(request())).rejects.toMatchObject({
      name: 'GenerationError',
      reason: 'empty_response',
    });
  });

  it.each([FinishReason.MAX_TOKENS, FinishReason.SAFETY, FinishReason.RECITATION])(
    'rejects a response that did not finish normally (%s)',
    async (finishReason) => {
      sdk.generateContent.mockResolvedValue({ text: '{"cut', candidates: [{ finishReason }] });
      const generate = createGeminiTextGenerator({ apiKey: 'k', model: 'm' });
      const error: unknown = await generate(request()).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(GenerationError);
      expect(error).toMatchObject({ reason: 'incomplete_response' });
    },
  );

  it('lets SDK errors propagate for the caller to classify', async () => {
    sdk.generateContent.mockRejectedValue(new Error('503'));
    const generate = createGeminiTextGenerator({ apiKey: 'k', model: 'm' });
    await expect(generate(request())).rejects.toThrow('503');
  });
});
