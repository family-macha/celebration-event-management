import { ApiError } from './errors';

/**
 * Reads a JSON request body while enforcing a hard size cap.
 *
 * The `Content-Length` header is only a hint (it can be absent or wrong), so
 * the cap is also enforced on the bytes actually received: the stream is
 * cancelled as soon as it exceeds the limit instead of being buffered whole.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw tooLarge(maxBytes);
  }

  const reader = request.body?.getReader();
  if (!reader) throw invalidJson();

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw invalidJson();
  }
}

function tooLarge(maxBytes: number): ApiError {
  return new ApiError(413, 'payload_too_large', `The request is larger than ${maxBytes} bytes.`);
}

function invalidJson(): ApiError {
  return new ApiError(400, 'invalid_json', 'The request body must be valid JSON (UTF-8).');
}
