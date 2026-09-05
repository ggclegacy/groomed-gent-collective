import Link from 'next/link';
import { MembershipSeal } from '@/components/materials';
export default function NotFound() {
  return (
    <main className="system-state">
      <MembershipSeal />
      <span className="eyebrow gold">THE COLLECTIVE / 404</span>
      <h1>A different door.</h1>
      <p>This page could not be found. Return to your residence to continue.</p>
      <Link href="/" className="gold-button">
        Return to the residence
      </Link>
    </main>
  );
}
