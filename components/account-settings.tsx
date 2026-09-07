'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  ArrowUpRight,
  Fingerprint,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Download,
  LifeBuoy,
  BadgeCheck,
} from 'lucide-react';
import { LogoutButton } from './account-session';
import type { AccountAccess } from '@/lib/account';
import { defaultSettings, type MemberSettings } from '@/lib/account-settings';
import type { Intelligence } from '@/lib/intelligence/model';

type Saved = { revision: number; settings: MemberSettings };
async function request<T>(
  path: string,
  data?: unknown,
  method = 'POST',
): Promise<T> {
  const response = await fetch(`/api/account${path}`, {
    cache: 'no-store',
    ...(data === undefined
      ? {}
      : {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
  });
  const result = (await response.json()) as T & { error?: string };
  if (response.status === 401) {
    window.location.replace('/sign-in');
    throw new Error('Sign in to continue.');
  }
  if (!response.ok)
    throw new Error(
      result.error || 'Your account could not be reached. Try again.',
    );
  return result as T;
}
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <main className="account-page">
      <a className="skip-link" href="#account-content">
        Skip to account
      </a>
      <header className="account-header">
        <Link href="/" className="account-wordmark">
          GROOMED GENT <span>THE COLLECTIVE</span>
        </Link>
        <Link href="/">
          <ArrowLeft size={17} /> Command
        </Link>
      </header>
      <div id="account-content" className="account-container">
        {children}
      </div>
      <footer className="account-footer">
        GROOMED GENT CO. <span>Considered in every detail.</span>
      </footer>
    </main>
  );
}
function Panel({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="account-panel">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'Not available';
export function AccountSettings() {
  const { user, isLoaded } = useUser();
  const [access, setAccess] = useState<AccountAccess | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [draft, setDraft] = useState<MemberSettings>({ ...defaultSettings });
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('load');
  const dirty =
    saved !== null && JSON.stringify(draft) !== JSON.stringify(saved.settings);
  const load = useCallback(
    () =>
      request<AccountAccess>('')
        .then(async (a) => {
          setError('');
          setAccess(a);
          if (!a.signedIn) {
            window.location.replace('/sign-in');
            return;
          }
          const s = await request<Saved>('/settings');
          setSaved(s);
          setDraft(s.settings);
          if (a.member?.status !== 'suspended')
            setIntelligence(await request<Intelligence>('/intelligence'));
        })
        .catch((e) =>
          setError(
            e instanceof Error ? e.message : 'Unable to load your account.',
          ),
        )
        .finally(() => setBusy('')),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save() {
    if (!saved) return;
    setBusy('save');
    setNotice('');
    setError('');
    try {
      const next = await request<Saved>(
        '/settings',
        { revision: saved.revision, settings: draft },
        'PUT',
      );
      setSaved(next);
      setDraft(next.settings);
      setNotice('Your account details are saved.');
      window.dispatchEvent(
        new CustomEvent('ggc:settings', { detail: next.settings }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to save. Your edits are still here.',
      );
    } finally {
      setBusy('');
    }
  }
  async function personalize() {
    if (!intelligence) return;
    setBusy('cassius');
    setError('');
    setNotice('');
    try {
      setIntelligence(
        await request<Intelligence>('/intelligence', {
          action: 'settings',
          revision: intelligence.revision,
          personalization: !intelligence.personalization,
        }),
      );
      setNotice('Your Cassius preference is saved.');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to save Cassius preferences.',
      );
    } finally {
      setBusy('');
    }
  }
  async function download() {
    setBusy('export');
    setError('');
    setNotice('');
    try {
      const data = await request('/export', {});
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collective-account-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Your download is ready. Keep this file somewhere private.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to export your data.');
    } finally {
      setBusy('');
    }
  }
  const name =
    saved?.settings.displayName ||
    user?.fullName ||
    access?.profile?.name ||
    'Your membership';
  const email = user?.primaryEmailAddress?.emailAddress || access?.email;
  const field = (
    key: 'displayName' | 'phone' | 'location' | 'business',
    label: string,
    max: number,
    autoComplete?: string,
  ) => (
    <label className="account-field">
      {label}
      <input
        name={key}
        autoComplete={autoComplete}
        type={key === 'phone' ? 'tel' : 'text'}
        maxLength={max}
        value={draft[key]}
        disabled={!saved || !!busy}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <AccountShell>
      <div className="account-title">
        <span className="account-eyebrow">YOUR PRIVATE MEMBERSHIP</span>
        <h1>
          Account <em>& Settings</em>
        </h1>
        <p>Your identity. Your preferences. Your place in the Collective.</p>
      </div>
      <section className="account-pass" aria-label="Your member profile">
        <div className="account-avatar">
          {user?.hasImage ? (
            <Image
              src={user.imageUrl}
              alt="Your profile photo"
              width={88}
              height={88}
              unoptimized
            />
          ) : (
            <Fingerprint size={42} strokeWidth={1} />
          )}
        </div>
        <div className="account-pass-name">
          <span className="account-eyebrow">THE COLLECTIVE</span>
          <h2>{isLoaded ? name : 'Opening your account…'}</h2>
          <p>{email}</p>
          {user?.username && <p>@{user.username}</p>}
          <Link href="/account/security">
            Edit photo & sign-in profile <ArrowUpRight size={15} />
          </Link>
          <div className="account-pass-session">
            <LogoutButton />
          </div>
        </div>
        <dl>
          <div>
            <dt>Membership</dt>
            <dd>
              <BadgeCheck size={16} />
              {access?.member
                ? `${access.member.track} · ${access.member.status}`
                : access
                  ? 'Member · partner access not enrolled'
                  : 'Loading…'}
            </dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>
              {date(access?.member?.joined_at || access?.profile?.created_at)}
            </dd>
          </div>
        </dl>
      </section>
      <nav className="account-nav" aria-label="Account sections">
        {[
          ['details', 'Profile'],
          ['membership', 'Ambassador'],
          ['preferences', 'Preferences'],
          ['privacy', 'Privacy'],
          ['help', 'Support'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
        <Link href="/account/security">
          Security <ArrowUpRight size={14} />
        </Link>
      </nav>
      <div className="account-feedback" aria-live="polite">
        {notice && <output>{notice}</output>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              disabled={!!busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    'Discard unsaved edits and reload the saved account details?',
                  )
                )
                  void load();
              }}
            >
              Reload saved details
            </button>
            <Link href="/account/security">
              Manage sign-in & email verification
            </Link>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="account-grid">
          <Panel
            id="details"
            icon={<Fingerprint size={21} />}
            title="Personal details"
          >
            <p>
              Your preferred name and contact details within the Collective.
            </p>
            <div className="account-fields">
              {field(
                'displayName',
                'Preferred / display name',
                100,
                'nickname',
              )}
              {field('phone', 'Contact phone (optional)', 40, 'tel')}
              {field(
                'location',
                'City / region (optional)',
                160,
                'address-level2',
              )}
              {field(
                'business',
                'Business / salon affiliation (optional)',
                200,
                'organization',
              )}
            </div>
            <div className="account-row">
              <div>
                <strong>Full name & verified email</strong>
                <p>
                  {user?.fullName ||
                    'Manage your name through secure profile settings'}
                  <br />
                  {email}
                </p>
              </div>
              <Link href="/account/security">
                Manage <ArrowUpRight size={15} />
              </Link>
            </div>
            <small>
              Contact phone is for your profile. Sign-in and recovery methods
              are managed separately in Security.
            </small>
          </Panel>
          <Panel
            id="membership"
            icon={<BadgeCheck size={21} />}
            title="Ambassador identity"
          >
            <dl className="account-facts">
              <div>
                <dt>Partner track</dt>
                <dd>{access?.member?.track || 'Not enrolled'}</dd>
              </div>
              <div>
                <dt>Access status</dt>
                <dd>{access?.member?.status || 'Standard account'}</dd>
              </div>
              <div>
                <dt>Account role</dt>
                <dd>{access?.profile?.role || 'Loading…'}</dd>
              </div>
              {access?.member?.track === 'barber' && (
                <div>
                  <dt>Wholesale eligibility</dt>
                  <dd>{access.member.wholesale_status.replaceAll('_', ' ')}</dd>
                </div>
              )}
            </dl>
            <p>
              Referral codes and membership tiers have not been activated in
              this app. Your invitation and partner access are managed by the
              Collective.
            </p>
            <Link className="account-link" href="/membership">
              Membership & invitations <ArrowUpRight size={17} />
            </Link>
          </Panel>
          <Panel
            id="preferences"
            icon={<SlidersHorizontal size={21} />}
            title="Your preferences"
          >
            <label className="account-toggle" aria-label="Reduce motion">
              <span>
                <strong>Reduce motion</strong>
                <small>
                  Quiet transitions throughout your signed-in experience. Your
                  device’s reduced-motion setting is always respected.
                </small>
              </span>
              <input
                type="checkbox"
                checked={draft.reducedMotion}
                disabled={!saved || !!busy}
                onChange={(e) =>
                  setDraft({ ...draft, reducedMotion: e.target.checked })
                }
              />
            </label>
            <label className="account-field">
              Communication preference
              <select
                value={draft.communication}
                disabled={!saved || !!busy}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    communication: e.target
                      .value as MemberSettings['communication'],
                  })
                }
              >
                <option value="none">No optional updates</option>
                <option value="email">Email preferred</option>
              </select>
            </label>
            <small>
              This saves your preference for future Collective updates. Email
              campaigns and push notifications are not active. Required sign-in
              and security messages are managed by your sign-in provider.
            </small>
          </Panel>
          <Panel
            id="cassius"
            icon={<Sparkles size={21} />}
            title="Cassius, on your terms"
          >
            <p>
              Choose whether Cassius can use the private context you have
              reviewed and confirmed.
            </p>
            {intelligence ? (
              <div className="account-row">
                <span>
                  <strong>Personalization</strong>
                  <p>
                    {intelligence.personalization
                      ? 'Using your confirmed context'
                      : 'Your private context is not used'}
                  </p>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label="Cassius personalization"
                  aria-checked={intelligence.personalization}
                  disabled={!!busy}
                  onClick={() => void personalize()}
                >
                  {intelligence.personalization ? 'On' : 'Off'}
                </button>
              </div>
            ) : (
              <p>
                {access?.member?.status === 'suspended'
                  ? 'Cassius access is paused with your membership.'
                  : 'Cassius preferences are loading or unavailable.'}
              </p>
            )}
            <Link className="account-link" href="/my-cassius">
              Review knowledge & memory controls <ArrowUpRight size={17} />
            </Link>
            <Link className="account-link" href="/#profile">
              Gentleman profile & life preferences <ArrowUpRight size={17} />
            </Link>
          </Panel>
        </div>
        <div className="account-save">
          <span>
            {dirty
              ? 'You have unsaved changes.'
              : saved
                ? 'Your account is up to date.'
                : 'Connecting to your saved account…'}
          </span>
          <button
            className="account-primary"
            disabled={!dirty || !!busy}
            type="submit"
          >
            {busy === 'save' ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
      <div className="account-grid">
        <Panel
          id="security"
          icon={<ShieldCheck size={21} />}
          title="Security & sign-in"
        >
          <p>
            Manage your password, verified email, connected login methods and
            active devices through your secure account.
          </p>
          <Link className="account-link" href="/account/security">
            Open security settings <ArrowUpRight size={17} />
          </Link>
          <small>
            Password recovery is available from the sign-in screen. Only login
            methods enabled for the Collective appear.
          </small>
        </Panel>
        <Panel
          id="privacy"
          icon={<Download size={21} />}
          title="Privacy & your data"
        >
          <p>
            Download your Collective profile, settings, saved drafts, private
            memory and Cassius knowledge. Provider sign-in records, device-only
            drafts and external commerce records are separate.
          </p>
          <button
            type="button"
            disabled={!saved || !!busy}
            onClick={() => void download()}
          >
            <Download size={17} />
            {busy === 'export'
              ? 'Preparing download…'
              : 'Download my account data'}
          </button>
          <Link className="account-link" href="/my-cassius">
            Review or remove Cassius knowledge <ArrowUpRight size={17} />
          </Link>
        </Panel>
        <Panel id="help" icon={<LifeBuoy size={21} />} title="Member support">
          <p>
            For account access, partner membership or a data request, contact
            the Groomed Gent team.
          </p>
          <a
            className="account-link"
            href="https://groomedgentco.com/pages/contact"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact the Collective <ArrowUpRight size={17} />
          </a>
          <div className="account-legal">
            <a
              href="https://groomedgentco.com/policies/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Brand privacy policy
            </a>
            <a
              href="https://groomedgentco.com/policies/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
            >
              Brand terms of service
            </a>
          </div>
          <small>These links open Groomed Gent Co.’s published policies.</small>
        </Panel>
        <Panel
          id="session"
          icon={<ShieldCheck size={21} />}
          title="Your session"
        >
          <p>
            Finished for now? Log out to close your authenticated session on
            this device. You can revoke other sessions in Security.
          </p>
          <LogoutButton />
        </Panel>
      </div>
    </AccountShell>
  );
}
