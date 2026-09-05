'use client';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { ArrowRight, BookOpen, Check, LockKeyhole } from 'lucide-react';
import { CassiusCore, MembershipSeal } from '@/components/materials';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  cassiusGateway,
  type IntelligenceAnswer,
  partnerKinds,
  parseProfile,
  playbooks,
  storageKeys,
  type LocalProfile,
  type Section,
} from '@/lib/collective';

function subscribeStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener('ggc-local-save', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('ggc-local-save', onChange);
  };
}
function useLocalText(key: string) {
  return useSyncExternalStore(
    subscribeStorage,
    useCallback(() => {
      try {
        return localStorage.getItem(key) ?? '';
      } catch {
        return '';
      }
    }, [key]),
    () => '',
  );
}
function saveLocal(key: string, value: string) {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event('ggc-local-save'));
}

export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v);
        }}
      >
        <SelectTrigger aria-label={label} className="choice">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function ProfileEditor() {
  const saved = useLocalText(storageKeys.profile);
  const [edited, setProfile] = useState<LocalProfile | null>(null);
  const profile = edited ??
    parseProfile(saved) ?? { name: '', kind: 'Trusted partner' };
  const [message, setMessage] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const clean = parseProfile(JSON.stringify(profile));
        if (!clean) {
          setMessage('Enter a name between 1 and 80 characters.');
          return;
        }
        try {
          saveLocal(storageKeys.profile, JSON.stringify(clean));
          setProfile(clean);
          setMessage('Demo profile saved on this device.');
        } catch {
          setMessage(
            'Could not save on this device. Your changes are still visible here.',
          );
        }
      }}
    >
      <span className="eyebrow">DEMO IDENTITY</span>
      <h2>Make your introduction.</h2>
      <p className="small-note">
        Stored only in this browser. This does not create an account or activate
        membership.
      </p>
      <label className="field">
        Display name
        <input
          required
          maxLength={80}
          value={profile.name}
          placeholder="Your name"
          autoComplete="name"
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
      </label>
      <Choice
        label="Your world"
        value={profile.kind}
        options={partnerKinds}
        onChange={(kind) =>
          setProfile({ ...profile, kind: kind as LocalProfile['kind'] })
        }
      />
      <button className="gold-button" type="submit">
        Save demo profile <Check size={16} />
      </button>
      <output className="form-status">{message}</output>
    </form>
  );
}
function PerformanceWorkspace() {
  return (
    <>
      <p className="lede">
        The relationships you build deserve a clear picture.
      </p>
      <div className="connection-banner">
        <LockKeyhole size={19} />
        <div>
          <strong>Reporting is not connected</strong>
          <p>
            Shopify, referral attribution and the commission ledger are awaiting
            integration. No sales, customers or earnings are being reported.
          </p>
        </div>
      </div>
      <div className="ledger">
        {[
          [
            'Attributed sales',
            'Orders attributed under an approved referral policy.',
          ],
          [
            'Pending commission',
            'Potential earnings awaiting order and eligibility checks.',
          ],
          ['Approved commission', 'Confirmed earnings awaiting a payout.'],
          [
            'Paid commission',
            'Completed payouts from the connected payment provider.',
          ],
        ].map(([title, description]) => (
          <div key={title}>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <span>—</span>
          </div>
        ))}
      </div>
      <Empty className="pending-panel">
        <EmptyTitle>No connected transactions</EmptyTitle>
        <EmptyDescription>
          Your verified activity will appear here once reporting is configured.
          Commission rates, customer benefits and payout terms have not been
          set.
        </EmptyDescription>
      </Empty>
    </>
  );
}
function IntelligenceWorkspace({ initialQuestion }: { initialQuestion?: string }) {
  const saved = useLocalText(storageKeys.question);
  const brief = useLocalText(storageKeys.brief);
  const [edited, setQuestion] = useState<string | null>(null);
  const question = edited ?? (initialQuestion || brief || saved).slice(0, 10000);
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState<IntelligenceAnswer | null>(null);
  const [message, setMessage] = useState('');
  return (
    <>
      <p className="lede">
        CASSIUS. Grounded in Groomed Gent, built for your world.
      </p>
      <div className="intelligence-stage">
        <div className="intelligence-presence">
          <CassiusCore />
          <span className="eyebrow gold">CASSIUS</span>
          <h2>Bring a better question.</h2>
          <p>
            Product details. A thoughtful recommendation. A story that feels
            like you. Explore the sources behind the standard.
          </p>
        </div>
        <div className="intelligence-console">
          <div className="connection-banner">
            <span className="eyebrow">SOURCED KNOWLEDGE</span>
            <p>
              Search the Groomed Gent knowledge reviewed September 5, 2026.
              Explore product evidence, grooming and health curricula, and consultation questions.
              Responses are generated with OpenAI using this knowledge. Product claims still require approval.
            </p>
          </div>
          <p className="small-note">
            Your question is sent to OpenAI for a response. Avoid sharing private client information.
            For wellness conversations: education and preparing
            questions for a qualified clinician. No diagnosis or treatment
            direction.
          </p>
          {brief && (
            <div className="connection-banner">
              <p>
                A brief from Creator Studio is open. Your previously saved
                question is preserved. New questions are sent to OpenAI to generate responses and are not saved to this device.
              </p>
              <button
                className="outline-button"
                onClick={() => {
                  try {
                    saveLocal(storageKeys.brief, '');
                    setQuestion(null);
                    setMessage(
                      'Studio brief dismissed. Your saved question is restored.',
                    );
                  } catch {
                    setMessage('Could not clear the local brief.');
                  }
                }}
              >
                Return to saved question
              </button>
            </div>
          )}
          <div className="prompt-options">
            {[
              'Help me introduce the brand at the chair.',
              'What should I verify before recommending a product?',
              'Show the Cassius grooming curriculum.',
              'Show the Cassius health and wellness curriculum.',
              'What should I use on my beard?',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setQuestion(prompt);
                  setMessage('');
                }}
              >
                {prompt}
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!question.trim() || pending) return;
              setPending(true);
              setMessage("Cassius is considering your question…");
              setAnswer(null);
              const storageNote = 'This submission was not saved to this device.';
              try {
                const result = await cassiusGateway.askIntelligence(question);
                if (result.state === 'ready') {
                  setAnswer(result.data);
                  setMessage(storageNote);
                } else setMessage(result.message);
              } catch {
                setMessage('Cassius could not respond. Please try again.');
              } finally {
                setPending(false);
              }
            }}
          >
            <label className="field">
              Your question
              <textarea
                required
                maxLength={10000}
                rows={4}
                placeholder="What would you like to work through?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="gold-button"
              disabled={!question.trim() || pending}
            >
              {pending ? 'Considering…' : 'Ask Cassius'} <ArrowRight size={16} />
            </button>
            <output className="form-status">{message}</output>
          </form>
          {answer && (
            <section aria-label="Cassius sourced answer" aria-live="polite" className="pending-panel">
              <h3>Cassius</h3>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{answer.text}</p>
              <h4>{answer.citations.length ? 'Reference sources supplied to Cassius' : 'Evidence status'}</h4>
              <ul>
                {answer.citations.filter((c, i, all) => all.findIndex(x => x.url === c.url) === i).map(c => (
                  <li key={c.url}>{c.url.startsWith('https://') ? <a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> : c.title}</li>
                ))}
              </ul>
              <p className="small-note">{answer.citations.length ? 'Source observations are dated September 5, 2026. Website facts are not manufacturer certification or approved advertising claims.' : 'Curriculum and consultation guidance are editorial. Scientific grooming and health sources are awaiting ingestion and review.'}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
function KnowledgeWorkspace() {
  const [active, setActive] = useState(0);
  return (
    <>
      <p className="lede">Know the details. Earn the confidence.</p>
      <div className="connection-banner">
        <BookOpen size={20} />
        <div>
          <strong>Product claim approval pending</strong>
          <p>
            Cassius can now search dated website product evidence and unresolved
            questions. Manufacturer certification and advertising claim approval
            remain pending. These guides are editorial starter guidance.
          </p>
        </div>
      </div>
      <div className="knowledge-layout">
        <nav aria-label="Field guides" className="guide-nav">
          {playbooks.map((p, i) => (
            <button
              key={p.title}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              <span className="eyebrow">
                0{i + 1} / {p.category}
              </span>
              {p.title}
              <ArrowRight size={16} />
            </button>
          ))}
        </nav>
        <article className="panel guide">
          <span className="eyebrow gold">FIELD GUIDE / EDITORIAL DRAFT</span>
          <h2>{playbooks[active].title}</h2>
          <p>{playbooks[active].intro}</p>
          <ol>
            {playbooks[active].points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <p className="small-note">
            This guide is not an approved product specification or a brand
            policy.
          </p>
        </article>
      </div>
    </>
  );
}
function StatusWorkspace() {
  const complete = Boolean(parseProfile(useLocalText(storageKeys.profile)));
  return (
    <>
      <p className="lede">Recognition should mean something.</p>
      <div className="status-hero">
        <div>
          <span className="eyebrow gold">MEMBERSHIP PREVIEW</span>
          <h2>
            Built on the way
            <br />
            you show up.
          </h2>
          <p>
            Incentives, eligibility and membership tiers are not yet configured.
            No earned status or reward is being claimed in this preview.
          </p>
        </div>
        <MembershipSeal />
      </div>
      <div className="panel readiness">
        <div className="section-title">
          <h2>Your starting point</h2>
          <span>{complete ? 1 : 0} of 3 ready</span>
        </div>
        <Progress
          value={complete ? 100 / 3 : 0}
          aria-label="Membership setup readiness"
        />
        <div className="readiness-row">
          <span>
            {complete ? <Check size={18} /> : <FingerprintIcon />}Introduce
            yourself
          </span>
          <a href="#identity">
            {complete ? 'Edit local profile' : 'Create local profile'}{' '}
            <ArrowRight size={15} />
          </a>
        </div>
        <div className="readiness-row">
          <span>
            <LockKeyhole size={18} />
            Invitation & membership approval
          </span>
          <small>Not connected</small>
        </div>
        <div className="readiness-row">
          <span>
            <LockKeyhole size={18} />
            Referral offer & commission terms
          </span>
          <small>Not configured</small>
        </div>
        <p className="small-note">
          Readiness reflects this preview only. Saving a profile does not award
          membership, incentives or commission eligibility.
        </p>
      </div>
    </>
  );
}
function FingerprintIcon() {
  return <span className="empty-dot" />;
}
export function Workspace({ view, initialQuestion }: { view: Section; initialQuestion?: string }) {
  switch (view) {
    case 'performance':
      return <PerformanceWorkspace />;
    case 'intelligence':
      return <IntelligenceWorkspace initialQuestion={initialQuestion} />;
    case 'knowledge':
      return <KnowledgeWorkspace />;
    case 'status':
      return <StatusWorkspace />;
    default:
      return null;
  }
}
