'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, ArrowUp, BookOpen, Check, LockKeyhole, Plus } from 'lucide-react';
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
  const [submitted, setSubmitted] = useState('');
  const [conversation, setConversation] = useState<{ question: string; answer: IntelligenceAnswer }[]>([]);
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [ideas, setIdeas] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLElement>(null);
  const inFlight = useRef(false);
  const follow = useRef(true);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      if (!shell.current) return;
      const keyboard = !!viewport && window.innerHeight - viewport.height > 140;
      document.documentElement.dataset.cassiusKeyboard = String(keyboard);
      document.documentElement.style.setProperty('--cassius-toolbar-top', `${Math.max(8, shell.current.getBoundingClientRect().top - 43)}px`);
      shell.current.style.setProperty('--chat-height', `${Math.max(200, (viewport?.height ?? window.innerHeight) - Math.max(0, shell.current.getBoundingClientRect().top - (viewport?.offsetTop ?? 0)) - (window.innerWidth <= 760 && !keyboard ? 98 : 16))}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      delete document.documentElement.dataset.cassiusKeyboard;
      document.documentElement.style.removeProperty('--cassius-toolbar-top');
    };
  }, []);
  useEffect(() => {
    if (follow.current && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [conversation, pending, message]);
  useEffect(() => {
    if (input.current) {
      input.current.style.height = 'auto';
      input.current.style.height = `${Math.min(input.current.scrollHeight, 112)}px`;
    }
  }, [question]);
  async function send() {
    if (!question.trim() || inFlight.current) return;
    const asked = question.trim();
    inFlight.current = true;
    follow.current = true;
    setPending(true);
    setSubmitted(asked);
    setMessage('');
    setIdeas(false);
    try {
      const history = conversation.flatMap(turn => [
        { role: 'user' as const, content: turn.question },
        { role: 'assistant' as const, content: turn.answer.text },
      ]).slice(-12);
      while (history.reduce((n, turn) => n + turn.content.length, 0) > 24000 || history.some(turn => turn.content.length > 10000)) history.splice(0, 2);
      const result = await cassiusGateway.askIntelligence(asked, history);
      if (result.state === 'ready') {
        setConversation(previous => [...previous, { question: asked, answer: result.data }]);
        setQuestion('');
      } else setMessage(result.message);
    } catch {
      setMessage('Cassius could not respond. Your question is still here. Try sending again.');
    } finally {
      inFlight.current = false;
      setPending(false);
      setSubmitted('');
    }
  }
  const state = pending ? 'thinking' : message ? 'error' : focused ? 'attentive' : conversation.length ? 'answered' : 'idle';
  return (
    <section ref={shell} className="cassius-room" data-state={state} aria-label="Chat with Cassius">
      <header className="cassius-room-header">
        <div><span className="eyebrow gold">CASSIUS</span><span className="cassius-subtitle">Your personal intelligence</span></div>
        <button className="cassius-quiet-button" disabled={pending || !conversation.length} onClick={() => {
          setConversation([]); setQuestion(''); setMessage(''); input.current?.focus();
        }}><Plus size={16} /> New chat</button>
      </header>
      <div ref={transcript} className="cassius-transcript" role="log" aria-label="Conversation" aria-live="polite" onScroll={e => {
        const node = e.currentTarget;
        follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
      }}>
        {!conversation.length && !pending ? <div className="cassius-welcome">
          <CassiusCore state={state} />
          <span className="eyebrow gold">SPACE TO THINK. ROOM TO GROW.</span>
          <h2>What’s on your mind?</h2>
          <p>A sharper idea. Your next move.<br />Let’s work through it together.</p>
        </div> : <>
          <div className="cassius-presence-strip"><CassiusCore compact state={state} /><span>{pending ? 'Considering your question' : message ? 'Response unavailable' : 'Ready for your next thought'}</span></div>
          {conversation.map(({ question: asked, answer }, index) => <div className="cassius-turn" key={index}>
            <div className="cassius-user-message"><span>You</span><p>{asked}</p></div>
            <section className="cassius-answer" aria-label="Cassius answer"><span className="eyebrow gold">CASSIUS</span><p>{answer.text}</p>
              {answer.citations.length > 0 && <details><summary>View sources</summary><ul>{answer.citations.filter((c, i, all) => all.findIndex(x => x.url === c.url) === i).map(c => <li key={c.url}>{c.url.startsWith('https://') ? <a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> : c.title}</li>)}</ul></details>}
            </section>
          </div>)}
          {pending && <div className="cassius-turn"><div className="cassius-user-message"><span>You</span><p>{submitted}</p></div><output className="cassius-thinking"><i /><i /><i /> Cassius is thinking…</output></div>}
        </>}
      </div>
      <div className="cassius-compose-area">
        {brief && <div className="cassius-brief">Studio brief loaded <button disabled={pending} onClick={() => {
          try { saveLocal(storageKeys.brief, ''); setQuestion(null); } catch { setMessage('Could not clear the local brief.'); }
        }}>Dismiss brief</button></div>}
        {message && <p className="cassius-error" role="alert">{message}</p>}
        {ideas && <div className="cassius-ideas" aria-label="Conversation starters">{[
          ['Plan a trip', 'Help me plan a relaxed weekend in Chicago.'],
          ['Build an idea', 'Help me think through a business idea.'],
          ['Refine my routine', 'Help me build a grooming routine.'],
        ].map(([label, prompt]) => <button key={label} disabled={pending} onClick={() => { setQuestion(prompt); setIdeas(false); input.current?.focus(); }}>{label}<ArrowRight size={13} /></button>)}</div>}
        <form className="cassius-composer" onSubmit={e => { e.preventDefault(); void send(); }}>
          <label className="sr-only" htmlFor="cassius-question">Message Cassius</label>
          <textarea id="cassius-question" ref={input} required maxLength={10000} rows={1} placeholder="Ask Cassius anything…" value={question} readOnly={pending}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); void send(); } }} />
          <div className="cassius-composer-tools"><button type="button" className="cassius-quiet-button" aria-expanded={ideas} disabled={pending} onClick={() => setIdeas(!ideas)}><Plus size={15} /> Ideas</button>
            <span>{pending ? 'Thinking…' : focused ? 'Let’s explore it' : 'Make room for a better thought'}</span>
            <button type="submit" className="cassius-send" aria-label="Send message" disabled={!question.trim() || pending}><ArrowUp size={20} /></button>
          </div>
        </form>
        <details className="cassius-chat-note"><summary>AI conversation · About your chat</summary><p>Questions are sent to OpenAI. This conversation is not saved to this device and clears when you leave this section. Avoid private client information. Wellness guidance is educational, not diagnosis or treatment. Verify important details.</p></details>
      </div>
    </section>
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
