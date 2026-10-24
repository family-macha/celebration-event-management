/**
 * Text hygiene for anything that crosses a trust boundary: user free text going
 * *into* a model prompt, and model text coming *out* to the page.
 *
 * Invisible characters are listed as numeric code points rather than pasted in,
 * so this file contains only visible ASCII and a reviewer can see exactly what
 * is being removed.
 */

/**
 * Individual invisible code points used to hide or reorder text:
 * Arabic letter mark, zero-width space, left/right-to-left marks, line and
 * paragraph separators, word joiner and the byte-order mark.
 * The joiners U+200C and U+200D are deliberately kept so emoji sequences survive.
 */
const INVISIBLE_CODE_POINTS: ReadonlySet<number> = new Set([
  0x061c, 0x200b, 0x200e, 0x200f, 0x2028, 0x2029, 0x2060, 0xfeff,
]);

/** Bidirectional embeddings/overrides (202A-202E) and isolates (2066-2069). */
const INVISIBLE_RANGES: readonly (readonly [number, number])[] = [
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];

/** Unicode "Control" category: tabs, newlines, NUL, escape and friends. */
const CONTROL = /\p{Cc}/u;

/**
 * Characters that could forge or close the XML-style delimiters the prompt
 * wraps untrusted data in, and backticks that could open a code fence.
 */
const DELIMITER_CHARS = /[<>`]/g;

function isInvisibleOrControl(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    CONTROL.test(character) ||
    INVISIBLE_CODE_POINTS.has(codePoint) ||
    INVISIBLE_RANGES.some(([low, high]) => codePoint >= low && codePoint <= high)
  );
}

/**
 * Returns `input` as single-line plain text, at most `maxLength` characters
 * (code points, so no emoji is cut in half).
 *
 * Order matters: Unicode compatibility normalisation (NFKC) runs first so that
 * look-alikes such as the full-width less-than sign (U+FF1C) become `<`
 * *before* delimiters are removed.
 */
export function sanitizeFreeText(input: string, maxLength: number): string {
  const cleaned = Array.from(input.normalize('NFKC'), (character) =>
    isInvisibleOrControl(character) ? ' ' : character,
  )
    .join('')
    .replace(DELIMITER_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const characters = Array.from(cleaned);
  return characters.length > maxLength
    ? characters.slice(0, maxLength).join('').trimEnd()
    : cleaned;
}

/** Applies {@link sanitizeFreeText} to every string inside parsed JSON. */
export function sanitizeDeep(value: unknown, maxLength: number): unknown {
  if (typeof value === 'string') return sanitizeFreeText(value, maxLength);
  if (Array.isArray(value)) return value.map((item) => sanitizeDeep(item, maxLength));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeDeep(item, maxLength)]),
    );
  }
  return value;
}
