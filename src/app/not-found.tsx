import Link from 'next/link';

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Page not found</h1>
      <p>There is nothing at this address.</p>
      <p>
        <Link href="/">Back to the planner</Link>
      </p>
    </section>
  );
}
