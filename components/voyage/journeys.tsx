'use client';
import { TripPacking } from '@/components/life/workspace';
import { cityResources } from '@/lib/voyage/cities';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Compass,
  Clock,
  Check,
  LockKeyhole,
  Trash2,
} from 'lucide-react';
import { useGentleman } from '@/components/gentleman-context';
import { parseMemory, type PrivateRecord } from '@/lib/gentleman/model';
import {
  calendarExport,
  conflicts,
  emptyPlan,
  eventKinds,
  localTime,
  nextEvent,
  parsePlan,
  toInstant,
  type ItineraryEvent,
  type TripPlan,
} from '@/lib/voyage/model';

type EventDraft = {
  id: string;
  title: string;
  kind: ItineraryEvent['kind'];
  start: string;
  end: string;
  location: string;
  notes: string;
  anchored: boolean;
  status: ItineraryEvent['status'];
  contactId: string;
  completed: boolean;
};
export function VoyageJourneys() {
  const { memory, update, revision, dirty } = useGentleman();
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState<PrivateRecord | null>(null);
  const [event, setEvent] = useState<EventDraft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [includeProfile, setIncludeProfile] = useState(false);
  const [proposal, setProposal] = useState<{
    plan: TripPlan;
    basis: string;
    tripId: string;
  } | null>(null);
  const [now, setNow] = useState('');
  useEffect(() => {
    const refresh = () => setNow(new Date().toISOString());
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  const trips = memory.records.filter((r) => r.kind === 'trip');
  const trip = trips.find((r) => r.id === selected);
  const plan = trip?.tripPlan ?? emptyPlan();
  const upcoming = now ? nextEvent(plan, now) : null;
  const clashes = conflicts(plan.events);
  const contacts = memory.records.filter((r) => r.kind === 'person');
  function keep(record: PrivateRecord) {
    try {
      update(
        parseMemory({
          ...memory,
          records: memory.records.some((r) => r.id === record.id)
            ? memory.records.map((r) =>
                r.id === record.id ? { ...record, packing: r.packing } : r,
              )
            : [...memory.records, record],
        }),
      );
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check the trip details.');
      return false;
    }
  }
  function keepPlan(next: TripPlan) {
    if (trip) return keep({ ...trip, tripPlan: next });
    return false;
  }
  function newTrip() {
    setProposal(null);
    setEvent(null);
    setDraft({
      id: crypto.randomUUID(),
      kind: 'trip',
      title: '',
      detail: '',
      date: '',
      endDate: '',
      mode: 'leisure',
      completed: false,
      shareWithCassius: false,
      createdAt: new Date().toISOString(),
      tripPlan: emptyPlan(Intl.DateTimeFormat().resolvedOptions().timeZone),
    });
  }
  function editEvent(e?: ItineraryEvent) {
    setEvent(
      e
        ? {
            ...e,
            start: localTime(e.startAt, plan.timeZone),
            end: localTime(e.endAt, plan.timeZone),
          }
        : {
            id: crypto.randomUUID(),
            title: '',
            kind: trip?.mode === 'business' ? 'meeting' : 'experience',
            start: `${trip?.date}T09:00`,
            end: `${trip?.date}T10:00`,
            location: '',
            notes: '',
            anchored: false,
            status: 'suggested',
            contactId: '',
            completed: false,
          },
    );
  }
  async function generate(surprise: boolean) {
    if (!trip || revision === null || dirty || busy) return;
    setBusy(true);
    setError('');
    setProposal(null);
    const basis = JSON.stringify(trip);
    try {
      const response = await fetch('/api/voyage/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          revision,
          surprise,
          includeProfile,
        }),
        signal: AbortSignal.timeout(38000),
      });
      const raw = (await response.json()) as {
        error?: string;
        plan?: unknown;
        tripId?: string;
        revision?: number;
      };
      if (!response.ok) throw new Error(raw.error || 'Planning failed.');
      if (raw.tripId !== trip.id || raw.revision !== revision)
        throw new Error(
          'The planning response does not match this saved trip.',
        );
      setProposal({
        plan: parsePlan(raw.plan, trip.date, trip.endDate),
        basis,
        tripId: trip.id,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Planning is unavailable.');
    } finally {
      setBusy(false);
    }
  }
  function downloadCalendar() {
    if (!trip) return;
    const url = URL.createObjectURL(
      new Blob([calendarExport(plan, trip.id, new Date().toISOString())], {
        type: 'text/calendar;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voyage-itinerary.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const sorted = plan.events
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const days = [
    ...new Set(
      sorted.map((e) => localTime(e.startAt, plan.timeZone).slice(0, 10)),
    ),
  ];
  return (
    <section className="gent-space voyage">
      <span className="eyebrow gold">VOYAGE / YOUR NEXT HORIZON</span>
      {!trip ? (
        <>
          <h1>Go with intention.</h1>
          <p className="lede">
            A considered journey. Space to work, room to discover.
          </p>
          <button className="outline-button" onClick={newTrip}>
            <Plus size={16} />
            Plan a journey
          </button>
          <div className="voyage-journeys">
            {trips.map((t) => (
              <button
                key={t.id}
                className="voyage-journey"
                onClick={() => {
                  setSelected(t.id);
                  setDraft(null);
                  setError('');
                }}
              >
                <Compass size={24} />
                <span className="eyebrow gold">{t.mode}</span>
                <h2>{t.title}</h2>
                <p>
                  {t.date || 'Dates to decide'}
                  {t.endDate && ` — ${t.endDate}`}
                </p>
                <span>{t.tripPlan?.events.length ?? 0} itinerary events</span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          {!trips.length && !draft && (
            <div className="gent-empty">
              <Compass size={32} />
              <h2>Your itinerary starts here.</h2>
              <p>Choose your dates and purpose, then shape the details.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            className="voyage-back"
            onClick={() => {
              setSelected('');
              setEvent(null);
              setDraft(null);
            }}
          >
            <ArrowLeft size={16} />
            All journeys
          </button>
          <div className="voyage-heading">
            <div>
              <span className="eyebrow gold">{trip.mode} / TRIP COMMAND</span>
              <h1>{trip.title}</h1>
              <p>
                {trip.date} — {trip.endDate} · {plan.timeZone}
              </p>
            </div>
            <div className="gent-actions">
              <button
                className="outline-button"
                onClick={() => setDraft({ ...trip, tripPlan: plan })}
              >
                Trip details
              </button>
              <button
                className="outline-button"
                disabled={!plan.events.length}
                onClick={downloadCalendar}
              >
                Export calendar
              </button>
            </div>
          </div>
          <div className="voyage-pulse">
            <Clock size={22} />
            <div>
              <span className="eyebrow gold">
                {upcoming && now >= upcoming.startAt
                  ? 'HAPPENING NOW'
                  : 'UP NEXT'}
              </span>
              <h2>{upcoming?.title ?? 'Room for your next move.'}</h2>
              <p>
                {upcoming
                  ? `${localTime(upcoming.startAt, plan.timeZone).replace('T', ' · ')} · ${upcoming.location || 'Location to decide'}`
                  : 'Add an event to build your trip timeline.'}
              </p>
            </div>
            <span>
              {plan.events.filter((e) => e.completed).length} /{' '}
              {plan.events.length} complete
            </span>
          </div>
          <div className="voyage-tools">
            <button className="gold-button" onClick={() => editEvent()}>
              <Plus size={16} />
              Add itinerary event
            </button>
            <details>
              <summary>Plan with Cassius</summary>
              <p>
                AI planning uses this saved trip’s brief and fixed events.
                Review suggestions before keeping them.
              </p>
              <label className="gent-check">
                <input
                  type="checkbox"
                  disabled={!memory.shareProfile}
                  checked={includeProfile && memory.shareProfile}
                  onChange={(e) => setIncludeProfile(e.target.checked)}
                />
                Include my travel, taste, style and grooming preferences
              </label>
              <p className="small-note">
                {revision === null
                  ? 'Connect private member services to use AI planning.'
                  : dirty
                    ? 'Save private memory before generating a plan.'
                    : 'Only the saved trip and selected preferences will be sent.'}
              </p>
              <div className="gent-actions">
                <button
                  className="outline-button"
                  disabled={busy || dirty || revision === null}
                  onClick={() => generate(false)}
                >
                  {busy ? 'Planning…' : 'Draft a structured itinerary'}
                </button>
                <button
                  className="outline-button"
                  disabled={
                    busy ||
                    dirty ||
                    revision === null ||
                    plan.events.some((e) => e.anchored)
                  }
                  onClick={() => generate(true)}
                >
                  Surprise me
                </button>
              </div>
            </details>
          </div>
          {!!clashes.length && (
            <div className="voyage-conflicts" role="alert">
              <strong>
                {clashes.length} schedule overlap{clashes.length > 1 ? 's' : ''}
              </strong>
              {clashes.map((c) => (
                <p key={`${c.a}-${c.b}`}>
                  {plan.events.find((e) => e.id === c.a)?.title} overlaps{' '}
                  {plan.events.find((e) => e.id === c.b)?.title}.
                </p>
              ))}
            </div>
          )}
          {proposal && proposal.tripId === trip.id && (
            <div className="gent-generated">
              <span className="eyebrow gold">REVIEW / UNVERIFIED AI DRAFT</span>
              <p>{proposal.plan.cityNotes}</p>
              {proposal.plan.events.map((e) => (
                <p key={e.id}>
                  {localTime(e.startAt, proposal.plan.timeZone).replace(
                    'T',
                    ' · ',
                  )}{' '}
                  — {e.title}
                  {e.anchored ? ' · Fixed' : ''}
                </p>
              ))}
              <p>
                {conflicts(proposal.plan.events).length} schedule overlaps to
                review. Non-fixed, unfinished events will be replaced.
              </p>
              <div className="gent-actions">
                <button
                  className="gold-button"
                  disabled={proposal.basis !== JSON.stringify(trip)}
                  onClick={() => {
                    if (keepPlan(proposal.plan)) setProposal(null);
                  }}
                >
                  Use this plan
                </button>
                <button onClick={() => setProposal(null)}>Discard draft</button>
              </div>
              {proposal.basis !== JSON.stringify(trip) && (
                <p>
                  Your trip changed while planning. Generate a new draft to
                  preserve those changes.
                </p>
              )}
            </div>
          )}
          <div className="voyage-grid">
            <div className="voyage-timeline">
              {days.map((day) => (
                <section key={day}>
                  <h2 className="voyage-day">{day}</h2>
                  {sorted
                    .filter((e) =>
                      localTime(e.startAt, plan.timeZone).startsWith(day),
                    )
                    .map((e) => (
                      <article
                        key={e.id}
                        className={`voyage-event ${e.completed ? 'done' : ''} ${upcoming?.id === e.id ? 'next' : ''}`}
                      >
                        <div className="voyage-time">
                          {localTime(e.startAt, plan.timeZone).slice(11)}
                          <small>
                            {localTime(e.endAt, plan.timeZone).slice(0, 10) !==
                            day
                              ? localTime(e.endAt, plan.timeZone).slice(0, 10) +
                                ' '
                              : ''}
                            {localTime(e.endAt, plan.timeZone).slice(11)}
                          </small>
                        </div>
                        <div>
                          <span className="eyebrow gold">
                            {e.kind}
                            {e.anchored ? ' / FIXED' : ''}
                          </span>
                          <h3>{e.title}</h3>
                          <p>{e.location}</p>
                          {e.notes && <p>{e.notes}</p>}
                          {e.contactId && (
                            <a href="#circle">
                              With{' '}
                              {
                                contacts.find((p) => p.id === e.contactId)
                                  ?.title
                              }{' '}
                              · Open Circle
                            </a>
                          )}
                          <small>
                            {e.status === 'suggested'
                              ? 'Unverified suggestion'
                              : 'Confirmed by you'}
                          </small>
                          <div className="gent-actions">
                            <button onClick={() => editEvent(e)}>Edit</button>
                            <button
                              onClick={() =>
                                keepPlan({
                                  ...plan,
                                  events: plan.events.map((x) =>
                                    x.id === e.id
                                      ? { ...x, completed: !x.completed }
                                      : x,
                                  ),
                                })
                              }
                            >
                              <Check size={14} />
                              {e.completed ? 'Reopen' : 'Complete'}
                            </button>
                            <button
                              aria-label={`Delete ${e.title}`}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${e.title}${e.anchored ? ' (fixed event)' : ''}?`,
                                  )
                                )
                                  keepPlan({
                                    ...plan,
                                    events: plan.events.filter(
                                      (x) => x.id !== e.id,
                                    ),
                                  });
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                </section>
              ))}
            </div>
            <aside className="voyage-aside">
              <TripPacking key={trip.id} trip={trip} />
              <div>
                <span className="eyebrow gold">CITY SOURCES</span>
                <p>
                  Open an official destination guide to check current visitor
                  information.
                </p>
                {cityResources
                  .filter((c) => plan.timeZone === c.timeZone)
                  .map((c) => (
                    <a
                      key={c.city}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {c.title} ↗
                    </a>
                  ))}
                {!cityResources.some((c) => plan.timeZone === c.timeZone) && (
                  <p className="small-note">
                    No reviewed city source is mapped to this trip time zone
                    yet.
                  </p>
                )}
                <p className="small-note">
                  Source directory checked September 5, 2026. Choose the
                  relevant city; a shared time zone does not establish your
                  destination.
                </p>
              </div>
              <div>
                <span className="eyebrow gold">TRAVEL GROOMING PROTOCOL</span>
                <h2>Arrive prepared.</h2>
                {!plan.grooming.length ? (
                  <>
                    <p>
                      Pack your established routine and leave time to prepare.
                    </p>
                    <button
                      className="outline-button"
                      onClick={() =>
                        keepPlan({
                          ...plan,
                          grooming: [
                            'Pack the products and tools from your existing routine.',
                            'Check your carrier and destination baggage rules.',
                            'Leave time for grooming and presentation before meetings.',
                          ].map((text) => ({
                            id: crypto.randomUUID(),
                            text,
                            done: false,
                          })),
                        })
                      }
                    >
                      Add preparation checklist
                    </button>
                  </>
                ) : (
                  plan.grooming.map((g) => (
                    <label className="gent-check" key={g.id}>
                      <input
                        type="checkbox"
                        checked={g.done}
                        onChange={() =>
                          keepPlan({
                            ...plan,
                            grooming: plan.grooming.map((x) =>
                              x.id === g.id ? { ...x, done: !x.done } : x,
                            ),
                          })
                        }
                      />
                      {g.text}
                    </label>
                  ))
                )}
              </div>
              <div>
                <span className="eyebrow gold">CITY NOTES</span>
                <p className="voyage-notes">
                  {plan.cityNotes ||
                    trip.detail ||
                    'Add local context in Trip details, or ask Cassius for a draft.'}
                </p>
                <p className="small-note">
                  No live flight, weather or venue availability feed is
                  connected.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
      {draft && (
        <form
          className="gent-editor"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.date || !draft.endDate) {
              setError('Choose departure and return dates.');
              return;
            }
            if (keep(draft)) {
              setSelected(draft.id);
              setDraft(null);
            }
          }}
        >
          <h2>Shape the journey</h2>
          <label>
            Destination / trip name
            <input
              required
              maxLength={160}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <div className="gent-fields">
            <label>
              Departure
              <input
                type="date"
                required
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </label>
            <label>
              Return
              <input
                type="date"
                required
                min={draft.date}
                value={draft.endDate}
                onChange={(e) =>
                  setDraft({ ...draft, endDate: e.target.value })
                }
              />
            </label>
            <label>
              Purpose
              <select
                value={draft.mode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    mode: e.target.value as PrivateRecord['mode'],
                  })
                }
              >
                <option value="leisure">Leisure</option>
                <option value="business">Business</option>
                <option value="hybrid">Business + leisure</option>
              </select>
            </label>
            <label>
              Trip time zone
              <input
                required
                placeholder="Europe/Paris"
                value={draft.tripPlan?.timeZone ?? 'UTC'}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tripPlan: {
                      ...(draft.tripPlan ?? emptyPlan()),
                      timeZone: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
          <label>
            Brief
            <textarea
              rows={4}
              maxLength={16000}
              value={draft.detail}
              onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
            />
          </label>
          <label>
            City notes
            <textarea
              rows={3}
              maxLength={6000}
              value={draft.tripPlan?.cityNotes ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tripPlan: {
                    ...(draft.tripPlan ?? emptyPlan()),
                    cityNotes: e.target.value,
                  },
                })
              }
            />
          </label>
          <label className="gent-check">
            <input
              type="checkbox"
              checked={draft.shareWithCassius}
              onChange={(e) =>
                setDraft({ ...draft, shareWithCassius: e.target.checked })
              }
            />
            Allow in selected universal Cassius context
          </label>
          <p className="small-note">
            Changing a time zone preserves event instants and changes their
            displayed local times. Keep these changes, then save private memory.
          </p>
          <div className="gent-actions">
            <button className="gold-button">Keep trip</button>
            <button type="button" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {event && trip && (
        <form
          className="gent-editor"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const { start, end, ...rest } = event;
              const next = {
                ...rest,
                startAt: toInstant(start, plan.timeZone),
                endAt: toInstant(end, plan.timeZone),
              };
              if (
                keepPlan({
                  ...plan,
                  events: plan.events.some((x) => x.id === event.id)
                    ? plan.events.map((x) => (x.id === event.id ? next : x))
                    : [...plan.events, next],
                })
              )
                setEvent(null);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : 'Check event times.',
              );
            }
          }}
        >
          <h2>Itinerary event</h2>
          <p>Times are local to {plan.timeZone}.</p>
          <label>
            Title
            <input
              required
              maxLength={160}
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
            />
          </label>
          <div className="gent-fields">
            <label>
              Starts
              <input
                required
                type="datetime-local"
                value={event.start}
                onChange={(e) => setEvent({ ...event, start: e.target.value })}
              />
            </label>
            <label>
              Ends
              <input
                required
                type="datetime-local"
                value={event.end}
                onChange={(e) => setEvent({ ...event, end: e.target.value })}
              />
            </label>
            <label>
              Kind
              <select
                value={event.kind}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    kind: e.target.value as ItineraryEvent['kind'],
                  })
                }
              >
                {eventKinds.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>
              Person from Circle
              <select
                value={event.contactId}
                onChange={(e) =>
                  setEvent({ ...event, contactId: e.target.value })
                }
              >
                <option value="">No linked person</option>
                {contacts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Location
            <input
              maxLength={300}
              value={event.location}
              onChange={(e) => setEvent({ ...event, location: e.target.value })}
            />
          </label>
          <label>
            Notes
            <textarea
              maxLength={2000}
              value={event.notes}
              onChange={(e) => setEvent({ ...event, notes: e.target.value })}
            />
          </label>
          <label className="gent-check">
            <input
              type="checkbox"
              checked={event.anchored}
              onChange={(e) =>
                setEvent({ ...event, anchored: e.target.checked })
              }
            />
            <LockKeyhole size={14} />
            Fixed commitment — preserve during AI replanning
          </label>
          <label className="gent-check">
            <input
              type="checkbox"
              checked={event.status === 'member-confirmed'}
              onChange={(e) =>
                setEvent({
                  ...event,
                  status: e.target.checked ? 'member-confirmed' : 'suggested',
                })
              }
            />
            I have verified these details myself
          </label>
          <div className="gent-actions">
            <button className="gold-button">Keep event</button>
            <button type="button" onClick={() => setEvent(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <p role="alert">{error}</p>
    </section>
  );
}
