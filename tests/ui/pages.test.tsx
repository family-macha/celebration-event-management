import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import ErrorPage from '@/app/error';
import RootLayout, { metadata, viewport } from '@/app/layout';
import NotFound from '@/app/not-found';

import { accessibilityViolations } from './support';

describe('root layout', () => {
  const markup = renderToStaticMarkup(
    <RootLayout>
      <p>page content</p>
    </RootLayout>,
  );

  it('declares the page language', () => {
    expect(markup).toContain('<html lang="en">');
  });

  it('starts with a skip link that targets the main region', () => {
    expect(markup.indexOf('class="skip-link"')).toBeLessThan(markup.indexOf('<header'));
    expect(markup).toContain('href="#main"');
    expect(markup).toContain('<main id="main" tabindex="-1">');
  });

  it('provides banner, main and contentinfo landmarks in order, around the page content', () => {
    const header = markup.indexOf('<header');
    const main = markup.indexOf('<main');
    const content = markup.indexOf('page content');
    const footer = markup.indexOf('<footer');
    expect(header).toBeGreaterThan(-1);
    expect(header).toBeLessThan(main);
    expect(main).toBeLessThan(content);
    expect(content).toBeLessThan(footer);
  });

  it('is honest in the footer about what is and is not AI', () => {
    expect(markup).toMatch(/not from AI/);
    expect(markup).toMatch(/Gemini/);
    expect(markup).toMatch(/not quotes/);
  });

  it('never prevents people from zooming', () => {
    expect(viewport).toEqual(expect.objectContaining({ width: 'device-width', initialScale: 1 }));
    expect(viewport).not.toHaveProperty('maximumScale');
    expect(viewport).not.toHaveProperty('userScalable');
  });

  it('has a descriptive title and description', () => {
    expect(metadata.description).toMatch(/wedding, birthday or community event/);
    expect(metadata.title).toMatchObject({ default: 'Celebration & Event Planner' });
  });
});

describe('error page', () => {
  it('announces the problem, takes focus, and offers a retry without exposing the error', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const error = Object.assign(new Error('database password is hunter2'), { digest: 'abc' });
    const { container } = render(<ErrorPage error={error} reset={reset} />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Something went wrong' });
    expect(heading).toHaveFocus();
    expect(container).not.toHaveTextContent('hunter2');

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(await accessibilityViolations(container)).toEqual([]);
  });
});

describe('not-found page', () => {
  it('explains and links back to the planner', async () => {
    const { container } = render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the planner' })).toHaveAttribute('href', '/');
    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
