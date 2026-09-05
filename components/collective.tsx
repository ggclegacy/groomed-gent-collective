'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Copy,
  Fingerprint,
  House,
  ChartNoAxesCombined,
  Sparkles,
  BookOpen,
  Aperture,
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
import { CassiusCore, MembershipCard } from '@/components/materials';
import { ProductStudio } from '@/components/product-studio';
import { StudioWorkspace } from '@/components/studio-workspace';
import { ProfileEditor, Workspace } from '@/components/workspaces';
import {
  demoAmbassador,
  disconnectedPerformance,
  metricLabel,
  sections,
  type Section,
} from '@/lib/collective';
const navigation = [
  ['home', 'The residence', House],
  ['identity', 'Your identity', Fingerprint],
  ['performance', 'Your impact', ChartNoAxesCombined],
  ['intelligence', 'CASSIUS', Sparkles],
  ['knowledge', 'Product Studio', BookOpen],
  ['studio', 'Creator Studio', Aperture],
  ['status', 'Status & privileges', Award],
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
export default function Collective() {
  const [view, setView] = useState<Section>('home');
  const [notice, setNotice] = useState('');
  const previousView = useRef(view);
  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [view]);
  useEffect(() => {
    const sync = () => {
      const key = window.location.hash.slice(1);
      setView(sections.includes(key as Section) ? (key as Section) : 'home');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
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
    <SidebarProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation view={view} navigate={navigate} />
      <div className="app-main">
        <header className="topbar">
          <div className="top-title">
            <SidebarTrigger />
            <span>THE GROOMED GENT COLLECTIVE</span>
          </div>
          <Link className="membership-entry" href="/membership">
            Membership access
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
                ? 'RESIDENCE'
                : view === 'intelligence'
                  ? 'CASSIUS'
                  : view.toUpperCase()}
            </span>
            <span className="edition">EST. IN GOOD COMPANY</span>
          </div>
          {view === 'home' ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow gold">YOUR PRIVATE COLLECTIVE</span>
                  <h1>
                    Your world.
                    <br />
                    <em>Elevated.</em>
                  </h1>
                  <p>
                    A considered space to build your knowledge, shape your
                    voice, and represent Groomed Gent with confidence.
                  </p>
                  <a
                    className="gold-button"
                    href="#intelligence"
                    onClick={() => navigate('intelligence')}
                  >
                    Explore CASSIUS <ArrowUpRight size={18} />
                  </a>
                  <span className="small-note">
                    Your brand companion. Local knowledge is available.
                  </span>
                </div>
                <div className="cassius-preview">
                  <CassiusCore />
                  <div className="core-caption">
                    <span className="eyebrow">CASSIUS</span>
                    <p>Collective intelligence · Sourced knowledge</p>
                  </div>
                </div>
              </section>
              <section className="impact">
                <div className="section-title">
                  <h2>Your impact</h2>
                  <a
                    href="#performance"
                    onClick={() => navigate('performance')}
                  >
                    View performance <ArrowUpRight size={16} />
                  </a>
                </div>
                <div className="metrics">
                  {[
                    [
                      'Tracked visits',
                      metricLabel(disconnectedPerformance, 'clicks'),
                    ],
                    [
                      'Attributed orders',
                      metricLabel(disconnectedPerformance, 'orders'),
                    ],
                    ['Pending commission', '—'],
                    ['Paid to date', '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                      <small>Awaiting connection</small>
                    </div>
                  ))}
                </div>
                <p className="data-note">
                  <span /> No live activity connected. Dashes indicate
                  unavailable data, not zero earnings.
                </p>
              </section>
              <section className="destinations">
                <a href="#knowledge" onClick={() => navigate('knowledge')}>
                  <span className="eyebrow">01 / KNOW THE DETAILS</span>
                  <BookOpen />
                  <h2>Product Studio</h2>
                  <p>
                    Know the ritual. Understand the details. Represent with
                    confidence.
                  </p>
                  <span className="text-link">
                    Enter Product Studio <ArrowRight size={18} />
                  </span>
                </a>
                <a href="#studio" onClick={() => navigate('studio')}>
                  <span className="eyebrow">02 / MAKE IT YOUR OWN</span>
                  <Aperture />
                  <h2>Creator Studio</h2>
                  <p>
                    Your voice, with a considered starting point. Prepare your
                    next brand story.
                  </p>
                  <span className="text-link">
                    Create a draft <ArrowRight size={18} />
                  </span>
                </a>
                <a href="#status" onClick={() => navigate('status')}>
                  <span className="eyebrow">03 / GROW WITH INTENTION</span>
                  <Award />
                  <h2>A place to progress</h2>
                  <p>
                    A foundation for recognition, meaningful milestones and
                    future privileges.
                  </p>
                  <span className="text-link">
                    Explore your status <ArrowRight size={18} />
                  </span>
                </a>
              </section>
            </>
          ) : view !== 'studio' ? (
            <section className="detail-page">
              <span className="eyebrow gold">YOUR COLLECTIVE</span>
              <h1>{navigation.find(([key]) => key === view)?.[1]}</h1>
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
                <Workspace view={view} />
              )}
            </section>
          ) : null}
          <section className="detail-page" hidden={view !== 'studio'}>
            <span className="eyebrow gold">YOUR COLLECTIVE</span>
            <h1>Creator Studio</h1>
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
      <nav className="mobile-dock" aria-label="Quick navigation">
        {(
          [
            ['home', 'Home', House],
            ['intelligence', 'CASSIUS', Sparkles],
            ['studio', 'Create', Aperture],
            ['status', 'Status', Award],
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
    </SidebarProvider>
  );
}
