import { Fingerprint, ShieldCheck } from 'lucide-react';

/** Abstract material identity. Decorative energy never implies a live AI connection. */
export function CassiusCore({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`cassius-core${compact ? ' is-compact' : ''}`}
      aria-hidden="true"
    >
      <div className="core-orbit orbit-one" />
      <div className="core-orbit orbit-two" />
      <div className="core-sphere">
        <span />
        <i />
      </div>
      <div className="core-axis" />
    </div>
  );
}
export function MembershipCard() {
  return (
    <div className="membership">
      <div className="card-top">
        <span>GROOMED GENT CO.</span>
        <Fingerprint size={30} strokeWidth={1} />
      </div>
      <div className="card-wordmark">
        The <em>Collective.</em>
      </div>
      <div className="card-bottom">
        <span>
          DEMO AMBASSADOR<small>MEMBERSHIP PREVIEW</small>
        </span>
        <ShieldCheck size={22} strokeWidth={1} />
      </div>
    </div>
  );
}
export function MembershipSeal() {
  return (
    <div className="membership-seal" aria-hidden="true">
      <div>
        <ShieldCheck size={54} strokeWidth={1} />
      </div>
    </div>
  );
}
export function LoadingSurface({ label }: { label: string }) {
  return (
    <output className="loading-surface">
      <span className="loading-ring" />
      <span>{label}</span>
    </output>
  );
}
