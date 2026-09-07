'use client';
import { useMaterialScope } from '@/components/living-materials';
/* oxlint-disable next/no-html-link-for-pages -- Full document navigation is intentional: Sites owns sign-in/out, and leaving the member editor must trigger its unsaved-work warning. */
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { MembershipSeal, LoadingSurface } from '@/components/materials';
import { StudioWorkspace } from '@/components/studio-workspace';
import type { AccountAccess, AccountLibrary } from '@/lib/account';
import { Choice } from '@/components/workspaces';
import { accountRequest } from '@/lib/account-client';
interface Invitation {
  id: string;
  email: string;
  name: string;
  track: string;
  expires_at: string;
  redeemed_by: string | null;
  revoked_at: string | null;
}
interface ManagedMember {
  user_id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  track: string;
}
export function MemberAccess({ studio = false }: { studio?: boolean }) {
  useMaterialScope();
  const [state, setState] = useState<AccountAccess | null>(null);
  const [library, setLibrary] = useState<AccountLibrary | null>(null);
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const next = await accountRequest<AccountAccess>('');
      setState(next);
      if (studio && next.member?.status === 'active')
        setLibrary(await accountRequest<AccountLibrary>('/library'));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not load membership.',
      );
    }
  }, [studio]);
  useEffect(() => {
    let cancelled = false;
    accountRequest<AccountAccess>('')
      .then(async (next) => {
        if (cancelled) return;
        setState(next);
        if (studio && next.member?.status === 'active') {
          const result = await accountRequest<AccountLibrary>('/library');
          if (!cancelled) setLibrary(result);
        }
      })
      .catch((error) => {
        if (!cancelled)
          setMessage(
            error instanceof Error
              ? error.message
              : 'Could not load membership.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [studio]);
  useEffect(() => {
    const revalidate = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', revalidate);
    return () => window.removeEventListener('pageshow', revalidate);
  }, []);
  return (
    <main className="member-page">
      <header className="member-header">
        <a href="/">
          GROOMED GENT CO. <span className="gold">/ THE COLLECTIVE</span>
        </a>
        <a href="/membership">Membership</a>
      </header>
      {!state ? (
        <section className="member-door">
          <MembershipSeal />
          <span className="eyebrow gold">PRIVATE ACCESS</span>
          <h1>Opening the door.</h1>
          {message ? (
            <p role="alert">{message}</p>
          ) : (
            <LoadingSurface label="Checking your membership…" />
          )}
          {message && (
            <button className="outline-button" onClick={() => void load()}>
              Try again
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="member-session">
            <ShieldCheck size={18} />
            <span>
              {state.local
                ? 'LOCAL DEVELOPMENT · Simulated Sites sign-in'
                : 'COLLECTIVE MEMBERSHIP'}
            </span>
            {state.signedIn && (
              <>
                <span>{state.email}</span>
                <a
                  href={state.signOutPath ?? '/signout-with-chatgpt?return_to=/membership'}
                  target="_top"
                >
                  Sign out
                </a>
              </>
            )}
          </div>
          {studio && state.member?.status === 'active' ? (
            <>
              <div className="member-studio-heading">
                <span className="eyebrow gold">
                  {state.member.name} / MEMBER STUDIO
                </span>
                <h1>Your work. Kept with you.</h1>
                <p>
                  Saved drafts belong to your signed-in account
                  {state.local ? ' in this local database' : ''}. The unsaved
                  editor stays in memory; save before leaving.
                </p>
              </div>
              {library ? (
                <StudioWorkspace
                  active
                  account={{ ...library, userId: state.member.user_id }}
                />
              ) : message ? (
                <p role="alert">{message}</p>
              ) : (
                <LoadingSurface label="Loading your saved drafts…" />
              )}
            </>
          ) : (
            <section className="member-door">
              <MembershipSeal />
              <span className="eyebrow gold">BY INVITATION</span>
              <h1>
                A place in
                <br />
                good company.
              </h1>
              <p>
                Membership starts with trust. Sign in with the email your
                invitation was issued to, then redeem your personal code.
              </p>
              {!state.configured ? (
                <div className="connection-banner">
                  Member services have not been configured for this environment.
                  The local preview remains available.
                </div>
              ) : !state.signedIn ? (
                <a
                  className="gold-button"
                  href={state.signInPath ?? '/signin-with-chatgpt?return_to=/membership'}
                  target="_top"
                >
                  {state.local
                    ? 'Sign in for local development'
                    : state.signInPath ? 'Sign in to your account' : 'Sign in with ChatGPT'}{' '}
                  <ArrowRight size={16} />
                </a>
              ) : state.member ? (
                <div className="membership-record">
                  <span className="eyebrow gold">
                    {state.member.status === 'active'
                      ? 'ACTIVE MEMBER'
                      : 'MEMBERSHIP PAUSED'}
                  </span>
                  <h2>{state.member.name}</h2>
                  <p>
                    {state.member.track === 'barber'
                      ? 'Barber ambassador'
                      : 'Ambassador'}{' '}
                    · Wholesale access has not been granted.
                  </p>
                  {state.member.status === 'active' ? (
                    <a className="gold-button" href="/members/studio">
                      Enter your Studio <ArrowRight size={16} />
                    </a>
                  ) : (
                    <p>
                      Contact the Collective to review your access. Your account
                      drafts are retained.
                    </p>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setMessage('');
                    try {
                      setState(
                        await accountRequest<AccountAccess>('/accept', 'POST', {
                          token: token.trim(),
                        }),
                      );
                      setToken('');
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : 'Invitation could not be accepted.',
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label className="field">
                    Your invitation code
                    <input
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      maxLength={64}
                      required
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <button
                    className="gold-button"
                    disabled={busy || !token.trim()}
                  >
                    {busy ? 'Checking invitation…' : 'Accept invitation'}{' '}
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
              <output className="form-status">{message}</output>
              <a className="studio-text-button" href="/">
                Explore the local preview
              </a>
            </section>
          )}
          {state.owner && !studio && (
            <FounderDesk
              key={state.member?.status ?? 'invited'}
              onMembershipChange={load}
            />
          )}
        </>
      )}
    </main>
  );
}
function FounderDesk({
  onMembershipChange,
}: {
  onMembershipChange: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [track, setTrack] = useState('ambassador');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [observedAt, setObservedAt] = useState(() => Date.now());
  const [issued, setIssued] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [i, m] = await Promise.all([
        accountRequest<{ invitations: Invitation[] }>('/invitations'),
        accountRequest<{ members: ManagedMember[] }>('/members'),
      ]);
      setInvitations(i.invitations);
      setMembers(m.members);
      setObservedAt(Date.now());
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load the founder desk.',
      );
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      accountRequest<{ invitations: Invitation[] }>('/invitations'),
      accountRequest<{ members: ManagedMember[] }>('/members'),
    ])
      .then(([i, m]) => {
        if (cancelled) return;
        setInvitations(i.invitations);
        setMembers(m.members);
        setObservedAt(Date.now());
      })
      .catch((error) => {
        if (!cancelled)
          setMessage(
            error instanceof Error
              ? error.message
              : 'Could not load the founder desk.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function action(path: string, data: unknown) {
    setBusy(true);
    try {
      await accountRequest(path, 'POST', data);
      await refresh();
      await onMembershipChange();
      setMessage('Access updated.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not update access.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="founder-desk">
      <span className="eyebrow gold">FOUNDER DESK</span>
      <h2>Invite with intention.</h2>
      <p>
        Invitations are email-bound, expire after seven days and can be used
        once. Codes are shown only when issued. Nothing is emailed
        automatically.
      </p>
      <form
        className="invitation-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage('');
          setIssued(null);
          try {
            setIssued(
              await accountRequest('/invitations', 'POST', {
                email,
                name,
                track,
              }),
            );
            await refresh();
            setMessage(
              'Invitation created. Copy the code before leaving this page.',
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : 'Could not create invitation.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Name
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          Invitation email
          <input
            required
            type="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <Choice
          label="Partner track"
          value={track}
          options={['ambassador', 'barber']}
          onChange={setTrack}
        />
        <button className="gold-button" disabled={busy}>
          Issue invitation <ArrowRight size={16} />
        </button>
      </form>
      {issued && (
        <div className="invitation-code">
          <strong>Keep this invitation code</strong>
          <p>
            Expires {new Date(issued.expiresAt).toLocaleDateString()}. Share
            privately with the named invitee.
          </p>
          <code>{issued.token}</code>
          <button
            className="outline-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(issued.token);
                setMessage('Invitation code copied. No message has been sent.');
              } catch {
                setMessage('Select the code and copy it manually.');
              }
            }}
          >
            Copy code
          </button>
        </div>
      )}
      <output className="form-status">{message}</output>
      <div className="founder-ledgers">
        <section>
          <h3>Invitations</h3>
          {!invitations.length && <p>No invitations issued.</p>}
          {invitations.map((i) => (
            <div className="access-row" key={i.id}>
              <div>
                <strong>{i.name}</strong>
                <span>{i.email}</span>
                <small>
                  {i.redeemed_by
                    ? 'Accepted'
                    : i.revoked_at
                      ? 'Revoked'
                      : Date.parse(i.expires_at) <= observedAt
                        ? 'Expired'
                        : 'Pending'}{' '}
                  · {i.track}
                </small>
              </div>
              {!i.redeemed_by &&
                !i.revoked_at &&
                Date.parse(i.expires_at) > observedAt && (
                  <button
                    className="outline-button"
                    disabled={busy}
                    onClick={() =>
                      void action('/invitations/revoke', { id: i.id })
                    }
                  >
                    Revoke
                  </button>
                )}
            </div>
          ))}
        </section>
        <section>
          <h3>Members</h3>
          {!members.length && <p>No memberships accepted.</p>}
          {members.map((m) => (
            <div className="access-row" key={m.user_id}>
              <div>
                <strong>{m.name}</strong>
                <span>{m.email}</span>
                <small>
                  {m.track} · {m.status}
                </small>
              </div>
              <button
                className="outline-button"
                disabled={busy}
                onClick={() =>
                  void action('/members/status', {
                    id: m.user_id,
                    status: m.status === 'active' ? 'suspended' : 'active',
                  })
                }
              >
                {m.status === 'active' ? 'Pause access' : 'Restore access'}
              </button>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
