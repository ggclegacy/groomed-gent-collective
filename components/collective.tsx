'use client';
import Link from 'next/link';
import { GentlemanProvider, PersonalCommand, GentlemanWorkspace, GentlemanProfileEditor, CollectiveHub } from '@/components/gentleman-os';
import { CommandDashboard, type CommandHandoff } from '@/components/command-dashboard';
import type { Action } from '@/lib/dashboard/model';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Copy,
  Fingerprint,
  House,
  Compass, Users, Leaf, Briefcase, LockKeyhole, NotebookPen,
  Sparkles,
  Award,
  ShieldCheck,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { MembershipCard } from '@/components/materials';
import { ProductStudio } from '@/components/product-studio';
import { StudioWorkspace } from '@/components/studio-workspace';
import { ProfileEditor, Workspace } from '@/components/workspaces';
import {
  demoAmbassador,
  sections,
  type Section,
} from '@/lib/collective';
const navigation = [
 ['home','COMMAND',House], ['collective','COLLECTIVE',Award], ['intelligence','CASSIUS',Sparkles],
 ['voyage','VOYAGE',Compass], ['circle','CIRCLE',Users], ['life','LIFE',Leaf],
 ['desk','DESK',Briefcase], ['vault','VAULT',LockKeyhole], ['logbook','LOGBOOK',NotebookPen], ['profile','Gentleman Profile',Fingerprint],
] as const;
function Navigation({
  view,
  navigate,
}: {
  view: Section;
  navigate: (view: Section) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar className="club-sidebar">
      <SidebarHeader>
        <a href="#home" className="brand" onClick={() => navigate('home')}>
          <span className="monogram">
            GG<span>CO.</span>
          </span>
          <span>
            GROOMED GENT<span className="brand-sub">THE COLLECTIVE</span>
          </span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <p className="nav-label">YOUR INNER CIRCLE</p>
        <nav aria-label="Main navigation" className="collective-nav">
          {navigation.map(([key, label, Icon]) => (
            <a
              key={key}
              href={`#${key}`}
              aria-current={view === key ? 'page' : undefined}
              onClick={() => {
                navigate(key);
                setOpenMobile(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === 'intelligence' && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <div className="sidebar-note">
          <ShieldCheck size={20} />
          <p>
            Built on trust.
            <br />
            <span>Represented with intention.</span>
          </p>
        </div>
        <a
          className="member-mini"
          href="#identity"
          onClick={() => {
            navigate('identity');
            setOpenMobile(false);
          }}
        >
          <span className="avatar">GG</span>
          <span>
            Demo ambassador<small>Membership preview</small>
          </span>
          <ArrowUpRight size={16} />
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function Collective({ initialView = 'home' }: { initialView?: Section }) {
  const [view, setView] = useState<Section>(initialView);
  const [notice, setNotice] = useState('');
  const [handoff, setHandoff] = useState<CommandHandoff | null>(null);
  function commandAction(action: Action) {
    setHandoff(action.brief ? { destination: action.destination, brief: action.brief, productId: action.productId } : null);
    window.location.assign(`#${action.destination}`);
    navigate(action.destination);
  }
  const previousView = useRef(view);
  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [view]);
  useEffect(() => {
    const sync = () => {
      const key = window.location.hash.slice(1) || initialView;
      setView(sections.includes(key as Section) ? (key as Section) : 'home');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [initialView]);
  const navigate = (key: Section) => {
    setView(key);
    setNotice('');
  };
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Demo value copied. It is not an active customer offer.');
    } catch {
      setNotice(
        'Copy unavailable. Select and copy the displayed value manually.',
      );
    }
  }
  return (
    <GentlemanProvider view={view}><SidebarProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {view !== 'voyage' && <Navigation view={view} navigate={navigate} />}
      <div className={`app-main ${view === 'voyage' ? 'voyage-active' : ''}`}>
        <header className="topbar">
          <div className="top-title">
            <SidebarTrigger />
            <span>THE GROOMED GENT COLLECTIVE</span>
          </div>
          <Link className="membership-entry" href="/onboarding">
            My Cassius · Account
          </Link>
          <span className="preview-badge">
            <span /> DEMO EXPERIENCE
          </span>
        </header>
        <main id="main" tabIndex={-1} data-view={view}>
          <div className="page-heading">
            <span className="eyebrow">
              DEMO /{' '}
              {view === 'home'
                ? 'COMMAND CENTER'
                : view === 'intelligence'
                  ? 'CASSIUS'
                  : view.toUpperCase()}
            </span>
            <span className="edition">EST. IN GOOD COMPANY</span>
          </div>
          {view === 'home' ? (
            <><PersonalCommand /><CommandDashboard onAction={commandAction} /></>
          ) : view === 'collective' ? <CollectiveHub /> : view === 'profile' ? <GentlemanProfileEditor /> : ['voyage','circle','life','desk','vault','logbook'].includes(view) ? null : view !== 'studio' ? (
            <section className="detail-page">
              <span className="eyebrow gold">YOUR COLLECTIVE</span>
              <h1>{navigation.find(([key]) => key === view)?.[1] ?? ({identity:'Your identity',performance:'Your impact',knowledge:'Product Studio',status:'Status & privileges'} as Record<string,string>)[view]}</h1>
              {view === 'knowledge' ? (
                <ProductStudio />
              ) : view === 'identity' ? (
                <>
                  <p className="lede">
                    A personal introduction. A connection that starts with you.
                  </p>
                  <div className="identity-grid">
                    <div className="panel">
                      <ProfileEditor />
                    </div>
                    <div className="identity-pass">
                      <MembershipCard />
                      <div className="panel">
                        <span className="eyebrow">
                          YOUR SIGNATURE CODE · DEMO ONLY
                        </span>
                        <div className="code-row">
                          <strong>{demoAmbassador.code}</strong>
                          <button
                            aria-label="Copy demo code"
                            onClick={() => copy(demoAmbassador.code)}
                          >
                            <Copy size={18} />
                          </button>
                        </div>
                        <p className="referral">{demoAmbassador.referralUrl}</p>
                        <button
                          className="outline-button"
                          onClick={() => copy(demoAmbassador.referralUrl)}
                        >
                          Copy demo link <Copy size={16} />
                        </button>
                        <p className="small-note">
                          Example URL only. No discount, customer benefit or
                          commission is active.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <><CommandBrief handoff={handoff} view={view} dismiss={() => setHandoff(null)} /><Workspace view={view} initialQuestion={handoff?.destination === 'intelligence' ? handoff.brief : undefined} /></>
              )}
            </section>
          ) : null}
          {['voyage','circle','life','desk','vault','logbook'].map(space => <div key={space} hidden={view !== space}>{space !== 'voyage' || view === 'voyage' ? <GentlemanWorkspace view={space} /> : null}</div>)}
          <section className="detail-page" hidden={view !== 'studio'}>
            <span className="eyebrow gold">YOUR COLLECTIVE</span>
            <h1>Creator Studio</h1>
            <CommandBrief handoff={handoff} view={view} dismiss={() => setHandoff(null)} />
            <StudioWorkspace active={view === 'studio'} />
          </section>
          <output className="notice">{notice}</output>
          <footer className="footer">
            <span>
              GROOMED GENT CO. <span className="gold">/</span> THE COLLECTIVE
            </span>
            <span>Considered in every detail.</span>
          </footer>
        </main>
      </div>
      <nav hidden={view === 'voyage'} className="mobile-dock" aria-label="Quick navigation">
        {(
          [
            ['home', 'Home', House],
            ['intelligence', 'CASSIUS', Sparkles],
            ['voyage', 'Voyage', Compass],
            ['circle', 'Circle', Users],
          ] as const
        ).map(([key, label, Icon]) => (
          <a
            key={key}
            href={`#${key}`}
            aria-current={view === key ? 'page' : undefined}
            onClick={() => navigate(key)}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </SidebarProvider></GentlemanProvider>
  );
}

function CommandBrief({ handoff, view, dismiss }: { handoff: CommandHandoff | null; view: Section; dismiss: () => void }) {
  if (!handoff || handoff.destination !== view || view === "intelligence") return null;
  return <aside className="command-handoff"><span className="eyebrow gold">YOUR GROWTH MOVE</span><p>{handoff.brief}</p><p className="small-note">Use this brief in your working draft below.</p><button className="outline-button" onClick={dismiss}>Dismiss brief</button></aside>;
}
