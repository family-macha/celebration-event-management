import { connection } from 'next/server';

import { PlannerApp } from '@/components/PlannerApp';

/**
 * Rendered per request. The Content-Security-Policy carries a fresh nonce for
 * every response (see `src/proxy.ts`), and Next.js can only stamp that nonce on
 * its scripts when the page is not served from a static cache.
 */
export default async function HomePage() {
  await connection();

  return (
    <>
      <h1>Plan your celebration</h1>
      <p className="lede">
        A realistic budget split, a dated timeline and a vendor checklist for your wedding, birthday
        or community event, with ideas tailored to your guests.
      </p>
      <PlannerApp />
    </>
  );
}
