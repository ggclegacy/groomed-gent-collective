'use client';
import Link from 'next/link';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="system-state" role="alert">
      <span className="eyebrow gold">THE COLLECTIVE</span>
      <h1>A moment to reconnect.</h1>
      <p>
        This workspace could not be loaded. Try again, or return to the
        residence.
      </p>
      <div className="button-row">
        <button className="gold-button" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="outline-button">
          Return home
        </Link>
      </div>
    </main>
  );
}
