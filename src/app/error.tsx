'use client';

import { useEffect, useRef } from 'react';

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** Last-resort boundary. Shows nothing technical and never echoes the error. */
export default function ErrorPage({ reset }: ErrorPageProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section aria-labelledby="error-heading">
      <h1 id="error-heading" tabIndex={-1} ref={heading}>
        Something went wrong
      </h1>
      <p>We could not show this page. Your answers have not been saved anywhere.</p>
      <p>
        <button type="button" className="button-primary" onClick={reset}>
          Try again
        </button>
      </p>
    </section>
  );
}
