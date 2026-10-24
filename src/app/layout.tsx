import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Celebration & Event Planner',
    template: '%s · Celebration & Event Planner',
  },
  description:
    'Plan a wedding, birthday or community event: a realistic budget split, a dated timeline, a vendor checklist and personalised ideas.',
  robots: { index: true, follow: true },
};

// No `maximumScale` or `userScalable`: people must be able to zoom.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to the planner
        </a>
        <header className="site-header">
          <div className="shell">
            <p className="brand">Celebration &amp; Event Planner</p>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="shell">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="shell">
            <p>
              Budgets, dates and checklists come from transparent rules, not from AI. Only the
              creative ideas may be written by Gemini, and we always say when they are. Figures are
              planning guides, not quotes: confirm prices with your vendors.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
