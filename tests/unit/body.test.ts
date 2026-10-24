import { describe, expect, it, vi } from 'vitest';

import { readJsonBody } from '@/lib/http/body';
import { ApiError } from '@/lib/http/errors';

type StreamingInit = RequestInit & { duplex: 'half' };

function post(body: BodyInit | null, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/plan', { method: 'POST', body, headers });
}

function streamOf(chunks: Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index];
      index += 1;
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() {
      onCancel?.();
    },
  });
}

function streamingPost(chunks: Uint8Array[], onCancel?: () => void): Request {
  const init: StreamingInit = { method: 'POST', body: streamOf(chunks, onCancel), duplex: 'half' };
  return new Request('http://localhost/api/plan', init);
}

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the promise to reject with an ApiError');
}

const encode = (text: string) => new TextEncoder().encode(text);

describe('readJsonBody', () => {
  it('parses a small JSON body', async () => {
    await expect(readJsonBody(post('{"a":1,"b":[true,null]}'), 1024)).resolves.toEqual({
      a: 1,
      b: [true, null],
    });
  });

  it('accepts a body of exactly the maximum size and rejects one byte more', async () => {
    const exact = JSON.stringify({ v: 'x'.repeat(20) });
    const size = encode(exact).byteLength;
    await expect(readJsonBody(post(exact), size)).resolves.toBeDefined();
    expect((await failureOf(readJsonBody(post(exact), size - 1))).status).toBe(413);
  });

  it('refuses early when Content-Length already declares too much', async () => {
    const request = post('{}', { 'content-length': '999999' });
    const error = await failureOf(readJsonBody(request, 4096));
    expect(error).toMatchObject({ status: 413, code: 'payload_too_large' });
  });

  it('enforces the cap on bytes actually received, even with no Content-Length', async () => {
    const error = await failureOf(
      readJsonBody(post(JSON.stringify({ v: 'a'.repeat(6000) })), 4096),
    );
    expect(error.status).toBe(413);
  });

  it('stops reading and cancels the stream once the cap is exceeded', async () => {
    const onCancel = vi.fn();
    const chunk = encode('a'.repeat(1000));
    const request = streamingPost(
      Array.from({ length: 50 }, () => chunk),
      onCancel,
    );

    const error = await failureOf(readJsonBody(request, 2500));

    expect(error.status).toBe(413);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('reassembles multi-byte characters split across chunks', async () => {
    const bytes = encode('{"city":"Zürich €"}');
    const request = streamingPost([bytes.slice(0, 11), bytes.slice(11, 12), bytes.slice(12)]);
    await expect(readJsonBody(request, 1024)).resolves.toEqual({ city: 'Zürich €' });
  });

  it.each([
    ['malformed JSON', '{"a":'],
    ['an empty body', ''],
    ['plain text', 'hello'],
  ])('rejects %s as invalid JSON', async (_label, body) => {
    const error = await failureOf(readJsonBody(post(body), 1024));
    expect(error).toMatchObject({ status: 400, code: 'invalid_json' });
  });

  it('rejects bytes that are not valid UTF-8 instead of silently repairing them', async () => {
    const bad = new Uint8Array([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x3a, 0x31, 0x7d]);
    const error = await failureOf(readJsonBody(streamingPost([bad]), 1024));
    expect(error.code).toBe('invalid_json');
  });

  it('rejects a request with no body at all', async () => {
    const error = await failureOf(readJsonBody(new Request('http://localhost/api/plan'), 1024));
    expect(error.code).toBe('invalid_json');
  });
});
