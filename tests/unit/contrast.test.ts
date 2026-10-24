import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * WCAG 2.2 contrast checks computed from the real stylesheet, so changing a
 * design token can never silently break legibility in either theme.
 */

const css = readFileSync(
  fileURLToPath(new URL('../../src/app/globals.css', import.meta.url)),
  'utf8',
);

function readDeclarations(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((match) => [
      match[1] ?? '',
      (match[2] ?? '').trim(),
    ]),
  );
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const lightBlock = css.slice(css.indexOf(':root'), darkStart);
const darkBlock = css.slice(darkStart, css.indexOf('*,', darkStart));

const light = readDeclarations(lightBlock);
const darkOverrides = readDeclarations(darkBlock);
const dark = { ...light, ...darkOverrides };

const HEX = /^#[0-9a-f]{6}$/i;

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** [foreground token, background token, minimum ratio, where it is used] */
const PAIRS: readonly (readonly [string, string, number, string])[] = [
  ['text', 'bg', 4.5, 'body text'],
  ['text', 'surface', 4.5, 'cards, table cells, inputs'],
  ['text', 'surface-alt', 4.5, 'table header'],
  ['text-muted', 'bg', 4.5, 'hints and summary line'],
  ['text-muted', 'surface', 4.5, 'hints inside cards'],
  ['text-muted', 'surface-alt', 4.5, 'secondary text on tinted areas'],
  ['link', 'bg', 4.5, 'links'],
  ['link', 'surface', 4.5, 'links in cards, expandable questions'],
  ['link', 'info-bg', 4.5, 'links on tinted areas'],
  ['on-primary', 'primary', 4.5, 'primary button and skip link'],
  ['error', 'bg', 4.5, 'inline error text'],
  ['error', 'surface', 4.5, 'inline error text in cards'],
  ['error', 'error-bg', 4.5, 'error summary and urgent badge'],
  ['ok', 'ok-bg', 4.5, 'positive status'],
  ['warn', 'warn-bg', 4.5, 'compressed badge and notice'],
  ['text', 'info-bg', 4.5, 'priority and critical badges'],
  ['text', 'error-bg', 4.5, 'error summary body'],
  ['text', 'ok-bg', 4.5, 'positive status body'],
  ['text', 'warn-bg', 4.5, 'notice body'],
  // Non-text contrast (WCAG 1.4.11): control boundaries and the focus ring need 3:1.
  ['border', 'bg', 3, 'input border on the page'],
  ['border', 'surface', 3, 'input border on a card'],
  ['focus', 'bg', 3, 'focus ring on the page'],
  ['focus', 'surface', 3, 'focus ring on a card'],
  ['primary', 'surface-alt', 3, 'budget share bar fill'],
];

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme contrast', (_name, tokens) => {
  it.each(PAIRS)('%s on %s reaches %f:1 (%s)', (foreground, background, minimum) => {
    const fg = tokens[foreground];
    const bg = tokens[background];
    expect(fg, `--${foreground} is defined`).toMatch(HEX);
    expect(bg, `--${background} is defined`).toMatch(HEX);
    expect(contrast(fg ?? '', bg ?? '')).toBeGreaterThanOrEqual(minimum);
  });
});

describe('contrast calculation', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

describe('stylesheet hygiene', () => {
  it('defines every colour token in the dark theme that it defines in the light theme', () => {
    const colourTokens = Object.entries(light)
      .filter(([, value]) => HEX.test(value))
      .map(([name]) => name);
    expect(Object.keys(darkOverrides).sort()).toEqual(colourTokens.sort());
  });

  it('only uses tokens that exist', () => {
    const used = new Set([...css.matchAll(/var\(--([a-z-]+)\)/g)].map((match) => match[1] ?? ''));
    for (const name of used) {
      expect(light, `--${name} is used but not defined`).toHaveProperty(name);
    }
  });

  it('keeps a visible keyboard focus indicator and removes it only from programmatic focus targets', () => {
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*3px solid var\(--focus\)/);

    for (const rule of css.split('}')) {
      if (!/outline:\s*(none|0)\b/.test(rule)) continue;
      const selector = rule.slice(0, rule.indexOf('{')).trim();
      // Only elements focused by script (not by Tab) may hide the outline.
      expect(selector, `unexpected outline removal on "${selector}"`).toMatch(
        /tabindex|main:focus/,
      );
    }
  });

  it('respects reduced motion, forced colours and print', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');
  });

  it('never locks text size or zoom', () => {
    expect(css).not.toMatch(/font-size:\s*\d+px/);
  });
});
