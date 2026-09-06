'use client';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Compass,
  Users,
  Fingerprint,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useGentleman } from '@/components/gentleman-context';
import { ModuleSculpture } from '@/components/module-sculpture';
import { commandContext } from '@/lib/spatial/model';
export function SpatialCommand() {
  const { memory, ask } = useGentleman();
  const [day, setDay] = useState(''),
    [greeting, setGreeting] = useState('Welcome back');
  useEffect(() => {
    const refresh = () => {
      const d = new Date();
      setDay(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
      setGreeting(
        d.getHours() < 12
          ? 'Good morning'
          : d.getHours() < 18
            ? 'Good afternoon'
            : 'Good evening',
      );
    };
    const initial = setTimeout(refresh, 0),
      timer = setInterval(refresh, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  const context = commandContext(memory, day);
  return (
    <section className="spatial-command" aria-label="Personal command center">
      <div className="spatial-arrival command-theatre">
        <div className="command-scenery" aria-hidden="true">
          <i className="command-light command-light-purple" />
          <i className="command-light command-light-gold" />
          <i className="command-orbit command-orbit-one" />
          <i className="command-orbit command-orbit-two" />
          <i className="command-stars" />
          <i className="command-horizon" />
        </div>
        <div className="spatial-introduction">
          <span className="spatial-kicker">
            YOUR PRIVATE COMMAND / {day || 'TODAY'}
          </span>
          <h1>
            {greeting}
            {memory.profile.name ? `, ${memory.profile.name}` : ''}.
            <span>The day is yours.</span>
          </h1>
          <p>
            {context.priorities.length
              ? `${context.priorities.length} recorded priorities are ready for your attention.`
              : 'One considered move can shape the day.'}
          </p>
          <div className="spatial-primary-actions">
            <button
              className="gold-button"
              onClick={() =>
                ask(
                  'Help me prepare for today with the context I choose to share. Start with my priorities and upcoming commitments; ask about anything missing. Give me a short, useful plan, then a clear stopping point.',
                )
              }
            >
              Prepare my day <ArrowUpRight size={17} />
            </button>
            <a href="#logbook">
              Capture a thought <Plus size={16} />
            </a>
          </div>
        </div>
        <button
          className="spatial-instrument"
          onClick={() =>
            ask(
              'Help me with one thing that would make today better prepared. Ask what I want to focus on before using personal context.',
            )
          }
          aria-label="Open Cassius to prepare your day"
        >
          <span className="instrument-stage" aria-hidden="true">
            <svg className="instrument-chassis" viewBox="0 0 300 290" fill="none" aria-hidden="true">
              <path d="M78 18h144l59 59v136l-59 59H78l-59-59V77Z" />
              <path d="M88 35h124l51 51v118l-51 51H88l-51-51V86Z" />
              <path d="M150 18v14M150 258v14M19 145h14M267 145h14M61 59l10 10M229 221l10 10M61 231l10-10M229 69l10-10" />
            </svg>
            <i className="instrument-shadow" />
            <span className="instrument-body">
              <i className="instrument-ring ring-one" />
              <i className="instrument-ring ring-two" />
              <i className="instrument-ring ring-three" />
              <i className="instrument-center"><span className="orb-current" /><span className="orb-mark">C</span></i>
            </span>
            <i className="instrument-plinth" />
          </span>
          <span className="instrument-caption">
            CASSIUS <span>YOUR PERSONAL INTELLIGENCE</span>
          </span>
        </button>
      </div>
      <div className="spatial-next">
        <div className="spatial-next-heading">
          <span className="spatial-kicker">WITH INTENTION</span>
          <h2>Your next move.</h2>
        </div>
        <div className="spatial-priority-list">
          {context.priorities.length ? (
            context.priorities.slice(0, 3).map((r, i) => (
              <a
                key={r.id}
                href={`#${r.kind === 'person' ? 'circle' : r.kind === 'ritual' ? 'life' : r.kind === 'trip' ? 'voyage' : 'desk'}`}
              >
                <span className="spatial-index">0{i + 1}</span>
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {r.kind} · {r.date}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </a>
            ))
          ) : (
            <a href="#desk">
              <span className="spatial-index">01</span>
              <span>
                <strong>Choose what deserves your attention.</strong>
                <small>Add a task or decision to your Desk</small>
              </span>
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
      </div>
      <div className="spatial-worlds">
        <a href="#voyage" className="spatial-card world-voyage">
          <span className="spatial-card-head">
            <Compass size={21} />
            <span>01 / VOYAGE</span>
            <ArrowUpRight size={17} />
          </span>
          <ModuleSculpture variant="voyage" />
          <span className="spatial-card-body">
            <small>
              {context.trip ? 'YOUR NEXT DEPARTURE' : 'THE WORLD, CONSIDERED'}
            </small>
            <strong>{context.trip?.title || 'Go somewhere remarkable.'}</strong>
            <span>
              {context.trip?.date || 'Shape a journey around your purpose.'}
            </span>
          </span>
          <span className="spatial-card-foot">
            Open your travel command <ArrowRight size={16} />
          </span>
        </a>
        <a href="#circle" className="spatial-card world-circle">
          <span className="spatial-card-head">
            <Users size={21} />
            <span>02 / CIRCLE</span>
            <ArrowUpRight size={17} />
          </span>
          <ModuleSculpture variant="circle" />
          <span className="spatial-card-body">
            <small>PEOPLE WORTH REMEMBERING</small>
            <strong>
              {context.people
                ? `${context.people} connections. One place.`
                : 'Stay thoughtfully connected.'}
            </strong>
            <span>Context for a better next conversation.</span>
          </span>
          <span className="spatial-card-foot">
            Enter your Circle <ArrowRight size={16} />
          </span>
        </a>
        <a href="#life" className="spatial-card world-life">
          <span className="spatial-card-head">
            <Fingerprint size={21} />
            <span>03 / LIFE</span>
            <ArrowUpRight size={17} />
          </span>
          <ModuleSculpture variant="life" />
          <span className="spatial-card-body">
            <small>THE DETAILS THAT DEFINE YOU</small>
            <strong>
              {context.rituals
                ? `${context.ritualsRecorded} of ${context.rituals} rituals recorded today.`
                : 'An everyday standard.'}
            </strong>
            <span>Grooming, presentation and personal rhythm.</span>
          </span>
          <span className="spatial-card-foot">
            Refine your routine <ArrowRight size={16} />
          </span>
        </a>
      </div>
    </section>
  );
}
